import { addMonths, type SetupStepId } from "@splithouse/shared";
import { currentMonth } from "@/lib/month";
import { effectiveStartMonth } from "@/lib/setup/start-month";
import { getActiveMonth, type ActiveMonthDb } from "@/services/months/active-month.service";
import { readSetup, type SetupReadDb } from "./setup-record.service";

/** What reading where edits start needs. */
export type EditMonthDb = ActiveMonthDb & SetupReadDb;

/** Where household edits start, and whether First run is still on. */
export interface EditMonth {
  /** The month a new edit starts from: the start month in First run, otherwise the month after the active one. */
  month: string;
  /** The month the app treats as "now". */
  activeMonth: string;
  /** True while no month is open: every edit then works on the one first version. */
  firstSetup: boolean;
  /** First run's done steps, in order; empty once a month is open, since they are not read then. */
  doneSteps: SetupStepId[];
}

/**
 * Works out where household edits start. Read-only.
 *
 * @param db - The Prisma client, a transaction, or a fake in tests.
 * @returns The month edits start from, the active month, whether First run is still on and its done steps.
 */
export async function getEditMonth(db: EditMonthDb): Promise<EditMonth> {
  const opened = await db.month.findFirst({ orderBy: { month: "desc" }, select: { month: true } });
  if (!opened) {
    const { startMonth, doneSteps } = await readSetup(db);
    const current = currentMonth();
    return { month: effectiveStartMonth(startMonth, current), activeMonth: current, firstSetup: true, doneSteps };
  }
  const activeMonth = await getActiveMonth(db);
  return { month: addMonths(activeMonth, 1), activeMonth, firstSetup: false, doneSteps: [] };
}
