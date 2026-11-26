import { currentMonth as currentMonthAt } from "@splithouse/shared";
import { now } from "@/lib/now";

/**
 * The current billing month in Asia/Singapore, `YYYY-MM`. Reads the backend clock, so it follows
 * `DEV_NOW` outside production.
 */
export function currentMonth(): string {
  return currentMonthAt(now());
}

/**
 * The month the app treats as "now": the newest opened month, or the calendar month when that is later or nothing is
 * open yet. A month started early is ahead of the calendar, so it counts as the current one from then on.
 *
 * @param openedMonths - The opened months, `YYYY-MM`, in any order.
 * @param at - The moment; the backend clock by default.
 * @returns The month key, `YYYY-MM`.
 */
export function activeMonthOf(openedMonths: readonly string[], at: Date = now()): string {
  const calendar = currentMonthAt(at);
  const newest = openedMonths.reduce<string | null>((max, m) => (max === null || m > max ? m : max), null);
  return newest !== null && newest > calendar ? newest : calendar;
}
