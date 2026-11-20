import type { RecordPaymentChargeRow } from '@splithouse/shared';

/**
 * Record payment's ticked charges after one row's Checkbox is tapped.
 *
 * @param rows The For rows as the server sent them.
 * @param chargeId The tapped row's charge.
 * @returns The ticked charge ids, in the list's order.
 */
export function toggleTicked(rows: RecordPaymentChargeRow[], chargeId: string): string[] {
  return rows.filter((r) => (r.chargeId === chargeId ? !r.ticked : r.ticked)).map((r) => r.chargeId);
}

/**
 * Record payment's Select all: ticks every charge while some or none are ticked, and clears them once all are.
 *
 * @param rows The For rows as the server sent them.
 * @returns The ticked charge ids, in the list's order.
 */
export function toggleAllTicked(rows: RecordPaymentChargeRow[]): string[] {
  const all = rows.length > 0 && rows.every((r) => r.ticked);
  return all ? [] : rows.map((r) => r.chargeId);
}

/**
 * How Select all's box looks: ticked when every charge is, part-ticked when only some are.
 *
 * @param rows The For rows as the server sent them.
 * @returns The Checkbox's `value` and `indeterminate`.
 */
export function selectAllState(rows: RecordPaymentChargeRow[]): { value: boolean; indeterminate: boolean } {
  const ticked = rows.filter((r) => r.ticked).length;
  return { value: ticked > 0 && ticked === rows.length, indeterminate: ticked > 0 && ticked < rows.length };
}
