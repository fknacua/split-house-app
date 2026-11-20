import { todayKey, type RecordPaymentRequest, type RecordPaymentResponse } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { now } from "@/lib/now";

const CHARGE_SELECT = {
  id: true,
  month: true,
  personId: true,
  payViaPersonId: true,
  amountCents: true,
  paidCents: true,
} as const;

/** A charge as much as the save checks need. */
interface SaveChargeRow {
  id: string;
  month: string;
  personId: string;
  payViaPersonId: string | null;
  amountCents: number;
  paidCents: number | null;
}

/** The transaction client's slice this service uses, so tests can pass an in-memory fake. */
export interface SaveRecordPaymentTx {
  person: {
    findUnique(args: { where: { id: string }; select: { isOwner: true } }): Promise<{ isOwner: boolean } | null>;
  };
  charge: {
    findMany(args: { where: { id: { in: string[] } }; select: typeof CHARGE_SELECT }): Promise<SaveChargeRow[]>;
    updateMany(args: {
      where: { id: string; paidCents: null };
      data: { paidCents: number; paidOn: Date; paidByPersonId: string };
    }): Promise<{ count: number }>;
  };
}

/** The Prisma client, or a fake in tests. */
export interface SaveRecordPaymentDb {
  $transaction<T>(fn: (tx: SaveRecordPaymentTx) => Promise<T>): Promise<T>;
}

/**
 * Refuses a charge the From person can't pay here.
 *
 * @throws {ApiError} 409 `already_paid`, `nothing_to_pay`, `collected_elsewhere` (their own charge,
 * collected through someone else) or `not_their_charge` (someone else's charge, not collected
 * through them).
 */
function assertPayable(charge: SaveChargeRow, personId: string): void {
  if (charge.paidCents !== null) throw new ApiError(409, "already_paid", "One of these charges is already paid.");
  if (charge.amountCents <= 0) throw new ApiError(409, "nothing_to_pay", "One of these charges has nothing to pay.");
  const payerId = charge.payViaPersonId ?? charge.personId;
  if (payerId === personId) return;
  throw charge.personId === personId
    ? new ApiError(409, "collected_elsewhere", "One of these charges is paid through someone else.")
    : new ApiError(409, "not_their_charge", "One of these charges isn’t paid by this person.");
}

/**
 * Records a payment from one person for one or more charges, each paid in full (its own amount),
 * in one transaction: if any charge is refused, none is paid. The payer is stored as the From
 * person, who is the person each charge is collected through, or its own person. A charge in an
 * earlier month can get its payment late; a paid charge is never changed here.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param values - The From person, the ticked charge ids (repeats count once) and the day.
 * @returns The person, the paid charge ids and their months.
 * @throws {ApiError} 422 `no_date` without a day; 400 `invalid_request` for a day after today; 404
 * `no_person` for an unknown person or the owner; 404 `no_charge` for an unknown charge; 409
 * `already_paid` (also when a second save loses the race), `nothing_to_pay`, `collected_elsewhere`
 * or `not_their_charge`, as `assertPayable`.
 */
export async function saveRecordPayment(
  db: SaveRecordPaymentDb,
  values: RecordPaymentRequest,
): Promise<RecordPaymentResponse> {
  const { personId, paidOn } = values;
  if (!paidOn) throw new ApiError(422, "no_date", "Enter the day it was received.");
  if (paidOn > todayKey(now())) throw new ApiError(400, "invalid_request", "Received on can’t be after today.");
  const chargeIds = [...new Set(values.chargeIds)];

  return db.$transaction(async (tx) => {
    const person = await tx.person.findUnique({ where: { id: personId }, select: { isOwner: true } });
    if (!person || person.isOwner) throw new ApiError(404, "no_person", "That person has nothing to pay.");
    const charges = await tx.charge.findMany({ where: { id: { in: chargeIds } }, select: CHARGE_SELECT });
    if (charges.length !== chargeIds.length) throw new ApiError(404, "no_charge", "One of these charges doesn’t exist.");
    for (const charge of charges) assertPayable(charge, personId);

    for (const charge of charges) {
      // Only an unpaid charge is updated, so a save that loses a race pays nothing.
      const { count } = await tx.charge.updateMany({
        where: { id: charge.id, paidCents: null },
        data: { paidCents: charge.amountCents, paidOn: new Date(paidOn), paidByPersonId: personId },
      });
      if (count === 0) throw new ApiError(409, "already_paid", "One of these charges is already paid.");
    }
    const months = [...new Set(charges.map((c) => c.month))].sort().reverse();
    return { personId, chargeIds, months };
  });
}
