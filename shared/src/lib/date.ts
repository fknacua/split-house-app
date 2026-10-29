/**
 * Helpers for calendar dates as `YYYY-MM-DD` keys, in Asia/Singapore, matching `lib/month.ts`.
 * Display and picking only; the server decides which dates are allowed.
 */

import { TZDate } from '@date-fns/tz';
import { differenceInCalendarDays, format, getDaysInMonth, isValid, parse } from 'date-fns';

import { isValidMonthKey } from './month';

const SINGAPORE = 'Asia/Singapore';

const DATE_KEY_FORMAT = 'yyyy-MM-dd';

/**
 * Converts a date key to a date at midnight Singapore time.
 *
 * `parse` alone also accepts `2026-1-5`, so the key must format back to itself.
 *
 * @param key A date key, e.g. `2026-11-02`.
 * @returns Midnight at the start of that day in Singapore.
 * @throws {RangeError} When `key` is not a valid date key.
 */
function dateKeyToDate(key: string): TZDate {
  const date = parse(key, DATE_KEY_FORMAT, new TZDate(2000, 0, 1, SINGAPORE));
  if (!isValid(date) || format(date, DATE_KEY_FORMAT) !== key) {
    throw new RangeError(`Not a date key: ${key}`);
  }
  return date;
}

/**
 * Checks that a string is a date key.
 *
 * @param value Any string.
 * @returns `true` for a real calendar date written `YYYY-MM-DD`.
 */
export function isDateKey(value: string): boolean {
  try {
    dateKeyToDate(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * The date key of a date value, in Asia/Singapore.
 *
 * @param date The date value to get the key for.
 * @returns e.g. `2026-11-01`. A Singapore 1 Nov 00:30 gives `2026-11-01` even though UTC is still 31 Oct.
 */
export function dateKeyOf(date: Date): string {
  return format(new TZDate(date, SINGAPORE), DATE_KEY_FORMAT);
}

/**
 * Today's date key in Singapore.
 *
 * @param now The date value to use. Defaults to the device clock.
 * @returns e.g. `2026-11-02`.
 */
export function todayKey(now: Date = new Date()): string {
  return dateKeyOf(now);
}

/**
 * Converts a date key to a date value, for handing to a date picker.
 *
 * @param key A date key, e.g. `2026-11-02`.
 * @returns Midnight at the start of that day in Singapore.
 * @throws {RangeError} When `key` is not a valid date key.
 */
export function dateKeyToValue(key: string): Date {
  return dateKeyToDate(key);
}

/**
 * Formats a date key for display.
 *
 * @param key A date key, e.g. `2026-11-02`.
 * @returns e.g. `Mon, 2 Nov 2026`.
 * @throws {RangeError} When `key` is not a valid date key.
 */
export function formatDateLabel(key: string): string {
  return format(dateKeyToDate(key), 'EEE, d MMM yyyy');
}

/**
 * Formats a date key as day and month, for small text.
 *
 * @param key A date key, e.g. `2026-11-03`.
 * @returns e.g. `3 Nov`.
 * @throws {RangeError} When `key` is not a valid date key.
 */
export function formatDateShort(key: string): string {
  return format(dateKeyToDate(key), 'd MMM');
}

/**
 * Formats a date key as day, month and year with no weekday, for form fields and facts.
 *
 * @param key A date key, e.g. `2026-11-16`.
 * @returns e.g. `16 Nov 2026`.
 * @throws {RangeError} When `key` is not a valid date key.
 */
export function formatDateMedium(key: string): string {
  return format(dateKeyToDate(key), 'd MMM yyyy');
}

/**
 * Formats a span of days, such as a bill's billing period, without repeating the shared month
 * or year.
 *
 * @param start The first day's key, e.g. `2026-10-01`.
 * @param end The last day's key, e.g. `2026-10-31`.
 * @returns `1–31 Oct 2026` within one month, `16 Oct – 15 Nov 2026` within one year, and
 *   `16 Dec 2026 – 15 Jan 2027` across years.
 * @throws {RangeError} When either key is not a valid date key.
 */
export function formatDateRange(start: string, end: string): string {
  const from = dateKeyToDate(start);
  const to = dateKeyToDate(end);
  if (from.getFullYear() !== to.getFullYear()) {
    return `${format(from, 'd MMM yyyy')} – ${format(to, 'd MMM yyyy')}`;
  }
  if (from.getMonth() !== to.getMonth()) {
    return `${format(from, 'd MMM')} – ${format(to, 'd MMM yyyy')}`;
  }
  return `${format(from, 'd')}–${format(to, 'd MMM yyyy')}`;
}

/**
 * Counts the calendar days from one date key to another.
 *
 * @param to The date key counted towards, e.g. `2026-11-16`.
 * @param from The date key counted from, e.g. `2026-11-01`.
 * @returns 15 for the example. 0 for the same day, negative when `to` is before `from`.
 * @throws {RangeError} When either key is not a valid date key.
 */
export function daysUntil(to: string, from: string): number {
  return differenceInCalendarDays(dateKeyToDate(to), dateKeyToDate(from));
}

/**
 * Parses a day, abbreviated month and year in the `dd MMM yyyy` international date format
 * (e.g. `16 Nov 2026`), to a date key.
 *
 * @param text e.g. `16 Nov 2026`.
 * @returns e.g. `2026-11-16`, or `null` when `text` isn't a valid date in that shape.
 */
export function parseDisplayDate(text: string): string | null {
  const date = parse(text.trim(), 'dd MMM yyyy', new Date());
  return isValid(date) ? format(date, DATE_KEY_FORMAT) : null;
}

/**
 * Turns a due day from the household config into a date key in one month.
 *
 * @param month A month key, e.g. `2026-11`.
 * @param dueDay The day of the month, 1 to 31. A day past the month's end falls on its last day.
 * @returns e.g. `2026-11-07`, or null when no due day is set.
 * @throws {RangeError} When `month` is not a valid month key.
 */
export function dueDateKey(month: string, dueDay?: number): string | null {
  if (!dueDay) return null;

  if (!isValidMonthKey(month)) { 
    throw new RangeError(`Not a month key: ${month}`); 
  }

  const lastDayOfMonth = getDaysInMonth(dateKeyToDate(`${month}-01`));
  const dayOfTheMonth = dueDay > lastDayOfMonth ? lastDayOfMonth : dueDay;
  
  return `${month}-${String(dayOfTheMonth).padStart(2, '0')}`;
}
