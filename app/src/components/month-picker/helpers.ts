/**
 * The month picker's grid and year arrows, worked out from the months that can be picked. The server
 * decides which months those are; the picker only shows them.
 */

import { currentMonth, formatMonthShort } from '@splithouse/shared';

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
 * All 12 months of a year, January first.
 *
 * @param year The year shown.
 * @param months The months that can be picked, as `YYYY-MM` keys.
 * @param value The picked month, or `''`.
 * @returns The grid's cells.
 */
export function monthPickerCells(year: number, months: string[], value: string): MonthPickerCell[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`;
    return { month, name: formatMonthShort(month), allowed: months.includes(month), selected: month === value };
  });
}

/**
 * Where the year arrows lead: the nearest year on each side with a month that can be picked, so a year
 * with none is skipped. Null disables that arrow.
 *
 * @param year The year shown.
 * @param months The months that can be picked.
 * @returns The previous and next years.
 */
export function monthPickerAdjacentYears(
  year: number,
  months: string[],
): { previous: number | null; next: number | null } {
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
export function monthPickerOpeningYear(value: string, months: string[], today: string = currentMonth()): number {
  if (value) return yearOf(value);
  const years = months.map(yearOf);
  const thisYear = yearOf(today);
  return years.length === 0 || years.includes(thisYear) ? thisYear : Math.min(...years);
}
