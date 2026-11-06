import { addMonths } from "@splithouse/shared";
import { currentMonth } from "@/lib/month";
import { getActiveMonth, type ActiveMonthDb } from "@/services/months/active-month.service";

/**
 * The month First run's household starts, which the first version starts from. Until the `Setup` record holds the
 * chosen month (11.2), it is the current month.
 *
 * @returns The month key, `YYYY-MM`.
 */
export async function getStartMonth(): Promise<string> {
  return currentMonth();
}

/** Where household edits start, and whether First run is still on. */
export interface EditMonth {
  /** The month a new edit starts from: the start month in First run, otherwise the month after the active one. */
  month: string;
  /** The month the app treats as "now". */
  activeMonth: string;
  /** True while no month is open: every edit then works on the one first version. */
  firstSetup: boolean;
}

/**
 * Works out where household edits start. Read-only.
 *
 * @param db - The Prisma client, a transaction, or a fake in tests.
 * @returns The month edits start from, the active month and whether First run is still on.
 */
export async function getEditMonth(db: ActiveMonthDb): Promise<EditMonth> {
  const opened = await db.month.findFirst({ orderBy: { month: "desc" }, select: { month: true } });
  if (!opened) return { month: await getStartMonth(), activeMonth: currentMonth(), firstSetup: true };
  const activeMonth = await getActiveMonth(db);
  return { month: addMonths(activeMonth, 1), activeMonth, firstSetup: false };
}
