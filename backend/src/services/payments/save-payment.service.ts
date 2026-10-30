import { todayKey, type SavePaymentRequest, type SavePaymentResponse } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { now } from "@/lib/now";
import { getActiveMonth, type ActiveMonthDb } from "@/services/months/active-month.service";

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface SavePaymentDb extends ActiveMonthDb {
  charge: {
    findUnique(args: {
      where: { id: string };
      select: { month: true; personId: true; payViaPersonId: true; amountCents: true };
    }): Promise<{ month: string; personId: string; payViaPersonId: string | null; amountCents: number } | null>;
    updateMany(args: {
      where: { id: string; paidCents?: null };
      data: { paidCents: number; paidOn: Date; paidByPersonId: string };
    }): Promise<{ count: number }>;
  };
}

/**
 * Records what was received for one charge and when, as received: a short payment stays short,
 * with no carry. Saving over a stored payment replaces it (Edit payment). The payer is the person
 * the charge is paid via, or the person themselves.
 *
 * A charge in a month before the current one (`getActiveMonth`) can still get its first payment,
 * a late one, but a stored payment there cannot be changed.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param chargeId - The charge's id.
 * @param values - The amount received and the day.
 * @returns The charge and its month.
 * @throws {ApiError} 400 `invalid_request` for a day after today, 404 `no_charge` for an unknown
 * charge, 409 `nothing_to_pay` for a charge of zero or less, 409 `payment_locked` when changing a
 * stored payment in an earlier month (also when a second first payment there loses the race).
 */
export async function savePayment(
  db: SavePaymentDb,
  chargeId: string,
  values: SavePaymentRequest,
): Promise<SavePaymentResponse> {
  if (values.paidOn > todayKey(now())) {
    throw new ApiError(400, "invalid_request", "Received on can’t be after today.");
  }
  const [charge, activeMonth] = await Promise.all([
    db.charge.findUnique({
      where: { id: chargeId },
      select: { month: true, personId: true, payViaPersonId: true, amountCents: true },
    }),
    getActiveMonth(db),
  ]);
  if (!charge) throw new ApiError(404, "no_charge", "This charge doesn’t exist.");
  if (charge.amountCents <= 0) throw new ApiError(409, "nothing_to_pay", "This charge has nothing to pay.");

  // In an earlier month only an unpaid charge is updated, so a stored payment there is never replaced.
  const past = charge.month < activeMonth;
  const { count } = await db.charge.updateMany({
    where: past ? { id: chargeId, paidCents: null } : { id: chargeId },
    data: {
      paidCents: values.paidCents,
      paidOn: new Date(values.paidOn),
      paidByPersonId: charge.payViaPersonId ?? charge.personId,
    },
  });
  if (count === 0) {
    throw past
      ? new ApiError(409, "payment_locked", "Payments in an earlier month can’t be changed.")
      : new ApiError(404, "no_charge", "This charge doesn’t exist.");
  }
  return { chargeId, month: charge.month };
}
