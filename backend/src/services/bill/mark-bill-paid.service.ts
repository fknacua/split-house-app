import { todayKey, type MarkBillPaidRequest, type MarkBillPaidResponse } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { now } from "@/lib/now";

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface MarkBillPaidDb {
  bill: {
    findUnique(args: {
      where: { month: string };
      select: { paidCents: true };
    }): Promise<{ paidCents: number | null } | null>;
    updateMany(args: {
      where: { month: string; paidCents: null };
      data: { paidCents: number; paidOn: Date };
    }): Promise<{ count: number }>;
  };
}

/**
 * Records that the user paid the month's utilities bill: the amount (which may differ from Current
 * Charges) and the day. It pays nothing. Once every charge is also paid, Home shows the month as settled.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param month - `YYYY-MM`.
 * @param values - The amount and the day it was paid.
 * @returns The month.
 * @throws {ApiError} 400 `invalid_request` for a day after today, 404 `no_bill` when the month has no
 * saved bill, 409 `bill_paid` when it is already marked paid (also on a second tap that loses the race).
 */
export async function markBillPaid(
  db: MarkBillPaidDb,
  month: string,
  values: MarkBillPaidRequest,
): Promise<MarkBillPaidResponse> {
  if (values.paidOn > todayKey(now())) {
    throw new ApiError(400, "invalid_request", "Paid on can’t be after today.");
  }
  const bill = await db.bill.findUnique({ where: { month }, select: { paidCents: true } });
  if (!bill) throw new ApiError(404, "no_bill", "This month has no saved bill.");
  // Only an unpaid bill is updated, so two taps cannot both record a payment.
  const { count } = await db.bill.updateMany({
    where: { month, paidCents: null },
    data: { paidCents: values.paidCents, paidOn: new Date(values.paidOn) },
  });
  if (count === 0) throw new ApiError(409, "bill_paid", "This bill is already marked paid.");
  return { month };
}
