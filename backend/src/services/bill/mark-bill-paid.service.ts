import { todayKey, type MarkBillPaidRequest, type MarkBillPaidResponse } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { now } from "@/lib/now";
import { beginSettledCheck, type SettledEventsTx } from "@/services/notifications/notification-events.service";

/** The transaction client's slice this service uses, so tests can pass an in-memory fake. */
export interface MarkBillPaidTx extends SettledEventsTx {
  bill: SettledEventsTx["bill"] & {
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

/** The Prisma client, or a fake in tests. */
export interface MarkBillPaidDb {
  $transaction<T>(fn: (tx: MarkBillPaidTx) => Promise<T>): Promise<T>;
}

/**
 * Records that the user paid the month's utilities bill: the amount (which may differ from Current
 * Charges) and the day. It pays nothing. Once every charge is also paid, Home shows the month as settled, and a month
 * this settles records its settled FYI in the same transaction.
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
  return db.$transaction(async (tx) => {
    const bill = await tx.bill.findUnique({ where: { month }, select: { paidCents: true } });
    if (!bill) throw new ApiError(404, "no_bill", "This month has no saved bill.");
    const settled = await beginSettledCheck(tx, [month]);
    // Only an unpaid bill is updated, so two taps cannot both record a payment.
    const { count } = await tx.bill.updateMany({
      where: { month, paidCents: null },
      data: { paidCents: values.paidCents, paidOn: new Date(values.paidOn) },
    });
    if (count === 0) throw new ApiError(409, "bill_paid", "This bill is already marked paid.");
    await settled.finish();
    return { month };
  });
}
