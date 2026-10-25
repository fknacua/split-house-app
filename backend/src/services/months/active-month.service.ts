import { currentMonth } from "@/lib/month";

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface ActiveMonthDb {
  month: {
    findFirst(args: { orderBy: { month: "desc" }; select: { month: true } }): Promise<{ month: string } | null>;
  };
}

/**
 * The month the app treats as "now": the newest opened month, or the calendar month when that is
 * later or nothing is open yet. A month started early is ahead of the calendar, so it counts as the
 * current one from then on, and the month before it is history. Read-only: it does not open anything.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The month key, `YYYY-MM`.
 */
export async function getActiveMonth(db: ActiveMonthDb): Promise<string> {
  const newest = await db.month.findFirst({ orderBy: { month: "desc" }, select: { month: true } });
  const calendar = currentMonth();
  return newest && newest.month > calendar ? newest.month : calendar;
}
