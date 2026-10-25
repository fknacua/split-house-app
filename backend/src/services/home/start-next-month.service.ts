import { addMonths, type StartNextMonthResponse } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { openMonthIfNeeded } from "@/lib/month-open";
import { getHome, type HomeDb } from "./home.service";

/**
 * Opens the month after the newest opened one, ahead of the 1st, so billing can start before the
 * new month's bill arrives. Only a settled month can be closed this way. The newest month is read
 * through `getHome`, so "settled" means the same here as on Home.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The month that was opened.
 * @throws {ApiError} 409 `not_settled` when the newest month is not settled, 409 `month_already_open`
 * when the next month is already open (for example a second tap), and 409 `no_household` when no
 * household version covers the next month.
 */
export async function startNextMonth(db: HomeDb): Promise<StartNextMonthResponse> {
  const home = await getHome(db);
  if (home.status !== "settled") {
    throw new ApiError(409, "not_settled", `${home.monthName} is not settled yet.`);
  }

  const next = addMonths(home.month, 1);
  if (await db.month.findUnique({ where: { month: next } })) {
    throw new ApiError(409, "month_already_open", "The next month is already open.");
  }
  const opened = await openMonthIfNeeded(db, next);
  if (!opened) throw new ApiError(409, "no_household", "Set up the household first.");
  return { month: opened.month };
}
