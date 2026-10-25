import type { HistoryListResponse } from "@splithouse/shared";
import {
  buildHistoryList,
  type HistoryBillRow,
  type HistoryChargeRow,
} from "@/lib/history/build-history-list";
import { getActiveMonth, type ActiveMonthDb } from "@/services/months/active-month.service";

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface HistoryListDb extends ActiveMonthDb {
  bill: {
    findMany(args: {
      where: { month: { lt: string } };
      orderBy: { month: "desc" };
      select: { month: true; currentChargesCents: true };
    }): Promise<HistoryBillRow[]>;
  };
  charge: {
    findMany(args: {
      where: {
        person: { isOwner: false };
        OR: [{ month: { lt: string } }, { correctsMonth: { lt: string } }];
      };
      select: { month: true; correctsMonth: true; paidCents: true };
    }): Promise<HistoryChargeRow[]>;
  };
}

/**
 * Reads what the History list needs and hands it to `buildHistoryList`: every month before the active
 * month (the newest opened, so one started early counts) that has a saved bill, grouped by year,
 * newest first. Read-only: it does not open a month.
 *
 * @param db - The Prisma client, or a fake in tests.
 */
export async function getHistoryList(db: HistoryListDb): Promise<HistoryListResponse> {
  const current = await getActiveMonth(db);
  const [bills, charges] = await Promise.all([
    db.bill.findMany({
      where: { month: { lt: current } },
      orderBy: { month: "desc" },
      select: { month: true, currentChargesCents: true },
    }),
    // Matches on `correctsMonth` too: a correction added in the current month still belongs on an
    // older month. The user's own charges are not payments to anyone, so they are left out.
    db.charge.findMany({
      where: {
        person: { isOwner: false },
        OR: [{ month: { lt: current } }, { correctsMonth: { lt: current } }],
      },
      select: { month: true, correctsMonth: true, paidCents: true },
    }),
  ]);
  return buildHistoryList(bills, charges);
}
