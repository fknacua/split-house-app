/**
 * The month picker's grid and year arrows, worked out from the months that can be picked. The server
 * decides which months those are; the picker only shows them.
 */

import { currentMonth, formatMonthShort } from '@splithouse/shared';

/**
 * The months that can be picked: a list of `YYYY-MM` keys, or every month from one onward with no last
 * month (`{ from }`, the open-ended mode First run's Start month uses).
 */
export type MonthPickerMonths = string[] | { from: string };

/** One cell of the month grid. */
export interface MonthPickerCell {
  /** `YYYY-MM`. */
  month: string;
  /** e.g. `Jan`. */
  name: string;
  /** Whether it can be picked. A month that can't keeps its place, in the disabled style. */
  allowed: boolean;
  selected: boolean;
}

const yearOf = (month: string) => Number(month.slice(0, 4));

/**
 * Whether a month can be picked.
 *
 * @param month The `YYYY-MM` key.
 * @param months The months that can be picked.
 * @returns True when it is listed, or on or after the first month of an open-ended range.
 */
function isAllowed(month: string, months: MonthPickerMonths): boolean {
  return Array.isArray(months) ? months.includes(month) : month >= months.from;
}

/**
 * All 12 months of a year, January first.
 *
 * @param year The year shown.
 * @param months The months that can be picked.
 * @param value The picked month, or `''`.
 * @returns The grid's cells.
 */
export function monthPickerCells(year: number, months: MonthPickerMonths, value: string): MonthPickerCell[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`;
    return { month, name: formatMonthShort(month), allowed: isAllowed(month, months), selected: month === value };
  });
}

/**
 * Where the year arrows lead: the nearest year on each side with a month that can be picked, so a year
 * with none is skipped. Null disables that arrow. An open-ended range always has a next year.
 *
 * @param year The year shown.
 * @param months The months that can be picked.
 * @returns The previous and next years.
 */
export function monthPickerAdjacentYears(
  year: number,
  months: MonthPickerMonths,
): { previous: number | null; next: number | null } {
  if (!Array.isArray(months)) {
    const first = yearOf(months.from);
    return { previous: year > first ? Math.max(first, year - 1) : null, next: Math.max(first, year + 1) };
  }
  const years = months.map(yearOf);
  const earlier = years.filter((y) => y < year);
  const later = years.filter((y) => y > year);
  return {
    previous: earlier.length > 0 ? Math.max(...earlier) : null,
    next: later.length > 0 ? Math.min(...later) : null,
  };
}

/**
 * The year the picker opens on: the picked month's. With none picked, this year when it has a month that
 * can be picked, otherwise the earliest year that does.
 *
 * @param value The picked month, or `''`.
 * @param months The months that can be picked.
 * @param today The current month. Defaults to the device clock.
 * @returns The year.
 */
export function monthPickerOpeningYear(
  value: string,
  months: MonthPickerMonths,
  today: string = currentMonth(),
): number {
  if (value) return yearOf(value);
  const thisYear = yearOf(today);
  if (!Array.isArray(months)) return Math.max(thisYear, yearOf(months.from));
  const years = months.map(yearOf);
  return years.length === 0 || years.includes(thisYear) ? thisYear : Math.min(...years);
}
