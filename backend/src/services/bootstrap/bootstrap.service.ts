import type { BootstrapResponse } from "@splithouse/shared";
import { getActiveMonth, type ActiveMonthDb } from "@/services/months/active-month.service";

/** The slice of the Prisma client this module uses, so tests can pass an in-memory fake. */
export interface BootstrapDb extends ActiveMonthDb {
  householdVersion: {
    findFirst(args: { select: { id: true } }): Promise<{ id: string } | null>;
  };
}

/**
 * Builds the bootstrap response. Read-only: it does not open the month (Home does).
 * `currentMonth` is the active month, so a month started early counts as the current one.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns Whether a household version exists, whether First run is finished (a month is open), and the active month.
 */
export async function getBootstrap(db: BootstrapDb): Promise<BootstrapResponse> {
  const [version, opened, activeMonth] = await Promise.all([
    db.householdVersion.findFirst({ select: { id: true } }),
    db.month.findFirst({ orderBy: { month: "desc" }, select: { month: true } }),
    getActiveMonth(db),
  ]);
  return { hasHousehold: version !== null, setupComplete: opened !== null, currentMonth: activeMonth };
}
