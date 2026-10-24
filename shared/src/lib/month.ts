/**
 * Helpers for billing month keys (`YYYY-MM`). The current month is in
 * Asia/Singapore, matching the server's `currentMonth()`. Display only; the
 * server decides which months are allowed.
 */

import { TZDate } from '@date-fns/tz';
import { add, format, isValid, parse } from 'date-fns';

const SINGAPORE = 'Asia/Singapore';

const MONTH_KEY_FORMAT = 'yyyy-MM';

/**
 * Converts a month key to a date.
 *
 * `parse` alone also accepts `2026-1` as Jan 2026 and `26-11` as Nov 2026, so the key must format back to itself.
 *
 * @param key A month key, e.g. `2026-11`.
 * @returns The first date of the parsed month (SG Time), e.g. 1 Nov 2026 00:00 for `2026-11`.
 * @throws {RangeError} When `key` is not a valid month key.
 */
function monthKeyToDate(key: string): TZDate {
  const date = parse(key, MONTH_KEY_FORMAT, new TZDate(2000, 0, 1, SINGAPORE));
  if (!isValid(date) || format(date, MONTH_KEY_FORMAT) !== key) {
    throw new RangeError(`Not a month key: ${key}`);
  }
  return date;
}

/**
 * Checks that a string is a month key.
 *
 * Nothing in the app calls this yet. Unless it is meaningfully used by then,
 * remove it (and its tests) before go-live.
 *
 * @param value Any string.
 * @returns `true` for `YYYY-MM` with a month from 01 to 12.
 */
export function isMonthKey(value: string): boolean {
  try {
    monthKeyToDate(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * The month key of a date value, in Asia/Singapore.
 *
 * @param date The date value to get the month key for.
 * @returns e.g. `2026-11`. A Singapore 1 Nov 00:30 gives `2026-11` even though UTC is still October.
 */
export function monthKeyOf(date: Date): string {
  return format(new TZDate(date, SINGAPORE), MONTH_KEY_FORMAT);
}

/**
 * Get the current month on demand, SG Time
 *
 * @param now The date value to use. Defaults to the device clock.
 * @returns e.g. `2026-11`.
 */
export function currentMonth(now: Date = new Date()): string {
  return monthKeyOf(now);
}

/**
 * Formats a month key for display.
 *
 * @param key A month key, e.g. `2026-11`.
 * @returns e.g. `November 2026`.
 * @throws {RangeError} When `key` is not a valid month key.
 */
export function formatMonthLabel(key: string): string {
  return format(monthKeyToDate(key), 'MMMM yyyy');
}

/**
 * Formats a month key as its short name, for small text.
 *
 * @param key A month key, e.g. `2026-09`.
 * @returns e.g. `Sep`.
 * @throws {RangeError} When `key` is not a valid month key.
 */
export function formatMonthShort(key: string): string {
  return format(monthKeyToDate(key), 'MMM');
}

/**
 * Moves a month key forward or back.
 *
 * @param key A month key, e.g. `2026-11`.
 * @param delta Months to add; negative goes back.
 * @returns The new key, e.g. `addMonths('2026-11', 2)` is `2027-01`.
 * @throws {RangeError} When `key` is not a valid month key.
 */
export function addMonths(key: string, delta: number): string {
  const date = monthKeyToDate(key);
  const newDate = add(date, { months: delta });
  return format(newDate, MONTH_KEY_FORMAT);
}

/**
 * Lists consecutive month keys, for a month Select.
 *
 * @param from First month key.
 * @param count How many months. passing 0 or negative value will return empty.
 * @param direction `'forward'` lists later months, `'back'` lists earlier ones. Defaults to `forward`.
 * @returns `count` keys starting at `from`, e.g. `monthRange('2026-11', 3, 'back')` is
 * `2026-11`, `2026-10`, `2026-09`; empty when `count` is 0 or less.
 * @throws {RangeError} When `from` is not a valid month key.
 */
export function monthRange(
  from: string,
  count: number,
  direction: 'forward' | 'back' = 'forward'
): string[] {
  const step = direction === 'forward' ? 1 : -1;
  return Array.from({ length: Math.max(0, count) }, (_, i) => addMonths(from, i * step));
}
