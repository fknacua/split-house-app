import type { HistoryMonthResponse } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import {
  buildHistoryMonth,
  type HistoryMonthBillRow,
  type HistoryMonthChargeRow,
} from "@/lib/history/build-history-month";
import { currentMonth } from "@/lib/month";

const CHARGE_SELECT = {
  month: true,
  category: true,
  label: true,
  amountCents: true,
  paidCents: true,
  paidOn: true,
  correctsMonth: true,
  correctsCategory: true,
  createdAt: true,
  person: { select: { name: true } },
} as const;

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface HistoryMonthDb {
  bill: {
    findUnique(args: {
      where: { month: string };
      select: { currentChargesCents: true; paidOn: true };
    }): Promise<HistoryMonthBillRow | null>;
  };
  charge: {
    findMany(args: {
      where: { month?: string; correctsMonth?: string; person: { isOwner: false } };
      select: typeof CHARGE_SELECT;
    }): Promise<HistoryMonthChargeRow[]>;
  };
}

/**
 * Reads one past month's bill, its charges and the charges that correct it, and hands them to
 * `buildHistoryMonth`. Read-only: it does not open the month.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param month - The month key, e.g. `2026-10`.
 * @throws {ApiError} 404 when the month is not before the current month, or has no saved bill.
 */
export async function getHistoryMonth(
  db: HistoryMonthDb,
  month: string,
): Promise<HistoryMonthResponse> {
  if (month >= currentMonth()) throw notFound();
  // The user's own charges are not payments to anyone, so they are not listed.
  const [bill, charges, corrections] = await Promise.all([
    db.bill.findUnique({
      where: { month },
      select: { currentChargesCents: true, paidOn: true },
    }),
    db.charge.findMany({
      where: { month, person: { isOwner: false } },
      select: CHARGE_SELECT,
    }),
    db.charge.findMany({
      where: { correctsMonth: month, person: { isOwner: false } },
      select: CHARGE_SELECT,
    }),
  ]);
  if (!bill) throw notFound();
  return buildHistoryMonth(month, bill, charges, corrections);
}

function notFound() {
  return new ApiError(404, "not_found", "No history for that month.");
}
