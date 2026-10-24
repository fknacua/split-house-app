import { currentMonth as currentMonthAt } from "@splithouse/shared";
import { now } from "@/lib/now";

/**
 * The current billing month in Asia/Singapore, `YYYY-MM`. Reads the backend clock, so it follows
 * `DEV_NOW` outside production.
 */
export function currentMonth(): string {
  return currentMonthAt(now());
}
