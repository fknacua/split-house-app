/**
 * Display and input helpers for money. Amounts are integer cents, SGD. These
 * only format and parse; the app never calculates splits (the backend engine
 * does).
 */

/**
 * Formats integer cents as dollars with 2 decimals and thousands separators,
 * e.g. `186286` -> `$1,862.86`. Negative amounts (correction charges) show the
 * minus before the dollar sign, e.g. `-1500` -> `-$15.00`.
 *
 * @param amountCents Amount in integer cents. e.g 186286 for $1,862.86
 * @returns The formatted amount. e.g. `$1,862.86` or `-$1,862.86`.
 * @throws {RangeError} When `amountCents` is not an integer.
 */
export function formatCents(amountCents: number): string {
  if (!Number.isInteger(amountCents)) {
    throw new RangeError(`formatCents expects integer cents, got ${amountCents}`);
  }
  const abs = Math.abs(amountCents);
  const dollars = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const rest = (abs % 100).toString().padStart(2, '0');
  return `${amountCents < 0 ? '-' : ''}$${dollars}.${rest}`;
}

/**
 * Parses typed money text to integer cents, e.g. `1,862.86` -> `186286`.
 * Accepts an optional leading `-` (before the `$`, as `formatCents` writes
 * it), a `$`, thousands commas, and up to 2 decimals. Works on the digits as
 * text, so there is no float rounding.
 *
 * @param text What the user typed.
 * @returns Integer cents, or `null` when the text is empty or not a valid
 * amount (letters, more than 2 decimals, more than one point).
 */
export function parseMoneyToCents(text: string): number | null {
  const match = /^(-?)\$?(\d{1,3}(?:,\d{3})+|\d*)(?:\.(\d{0,2}))?$/.exec(text.trim().replace(/\s/g, ''));
  if (!match) return null;
  const [, sign, whole, fraction = ''] = match;
  if (whole === '' && fraction === '') return null;
  const dollars = Number(whole.replace(/,/g, '') || '0');
  const cents = dollars * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return null;
  return sign ? -cents : cents;
}

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
