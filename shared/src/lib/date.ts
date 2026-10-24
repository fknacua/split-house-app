/**
 * Helpers for calendar dates as `YYYY-MM-DD` keys, in Asia/Singapore, matching `lib/month.ts`.
 * Display and picking only; the server decides which dates are allowed.
 */

import { TZDate } from '@date-fns/tz';
import { format, isValid, parse } from 'date-fns';

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
