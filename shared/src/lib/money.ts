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
