import { formatDateShort } from '@splithouse/shared';

/**
 * Splits a due date into the big day number and the small month caption on a Home row.
 *
 * @param dueDate - A date key, e.g. `2026-11-01`.
 * @returns e.g. `{ day: '1', month: 'NOV' }`.
 * @throws {RangeError} When `dueDate` is not a valid date key.
 */
export function formatDueDate(dueDate: string): { day: string; month: string } {
  const [day, month] = formatDateShort(dueDate).split(' ');
  return { day, month: month.toUpperCase() };
}
