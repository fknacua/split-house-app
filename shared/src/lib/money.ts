/**
 * Display helper for money. Amounts are integer cents, SGD. This only formats;
 * the split engine in the backend does all the calculating.
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
 * Parses money text to integer cents, e.g. `1,862.86` -> `186286`. Accepts an optional
 * leading `-` (before the `$`, as `formatCents` writes it), an optional `$`, thousands
 * commas, and up to 2 decimals. Works on the digits as text, so there is no float rounding.
 *
 * @param text Money text, typed by a person or read off a bill.
 * @returns Integer cents, or `null` when the text is empty or not a valid amount (letters,
 * more than 2 decimals, more than one point).
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
