/**
 * Helpers for the money text input: cleaning what is typed and rendering
 * cents as editable text. Amounts are integer cents, SGD. Only the input
 * control uses these, so they stay in the app; parsing typed text to cents
 * is `parseMoneyToCents` from `@splithouse/shared`, re-exported here so call
 * sites don't need a second import.
 */

import { formatCents, parseMoneyToCents } from '@splithouse/shared';

export { parseMoneyToCents };

/**
 * Renders integer cents as plain editable text, with no `$` or thousands
 * commas, e.g. `186286` -> `1862.86`. Money inputs show this while focused.
 *
 * @param amountCents Amount in integer cents.
 * @returns The editable text.
 * @throws {RangeError} When `amountCents` is not an integer.
 */
export function centsToInputText(amountCents: number): string {
  return formatCents(amountCents).replace(/[$,]/g, '');
}

/**
 * Cleans text typed or pasted into a money input: drops everything except
 * digits, one decimal point and (when allowed) a leading `-`, and keeps at
 * most 2 decimals. Partial text such as `1862.` or `-` is kept so typing is
 * not interrupted.
 *
 * @param text The raw text from the input.
 * @param allowNegative Whether a leading `-` is kept.
 * @returns The cleaned text, which `parseMoneyToCents` can read when complete.
 */
export function sanitizeMoneyInput(text: string, allowNegative = false): string {
  const stripped = text.replace(/[^\d.-]/g, '');
  const negative = allowNegative && stripped.startsWith('-');
  const unsigned = stripped.replace(/-/g, '');
  const point = unsigned.indexOf('.');
  const cleaned =
    point === -1
      ? unsigned
      : `${unsigned.slice(0, point)}.${unsigned.slice(point + 1).replace(/\./g, '').slice(0, 2)}`;
  return negative ? `-${cleaned}` : cleaned;
}
