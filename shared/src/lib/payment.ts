/**
 * Display helper for a payment that differs from what the charge asked for. Wording only: it
 * compares two amounts already known and never splits anything.
 */

import { formatCents } from './money';
import { formatMonthName } from './month';

/** How a received amount differs from the expected one, worded for an Alert or a Recipient line. */
export interface PaymentDifference {
  /** `short` when less was received than expected, `over` when more. */
  kind: 'short' | 'over';
  /** e.g. `$63.65 short of $1,963.65` or `$20.00 over $1,963.65`. */
  title: string;
  /** What it means, e.g. `November stays $63.65 short until you edit the payment or add a correction.` */
  text: string;
}

/**
 * Words the difference between what a charge asked for and what was received. The month is the
 * charge's own, so a late payment for October reads "October stays…".
 *
 * @param expectedCents What the charge asks for, in integer cents.
 * @param paidCents What was received, in integer cents.
 * @param month The charge's month key, e.g. `2026-11`.
 * @returns The difference, or `null` when the amounts match.
 * @throws {RangeError} When an amount is not integer cents or `month` is not a valid month key.
 */
export function formatPaymentDifference(
  expectedCents: number,
  paidCents: number,
  month: string
): PaymentDifference | null {
  if (paidCents === expectedCents) return null;
  const expected = formatCents(expectedCents);
  const gap = formatCents(Math.abs(expectedCents - paidCents));
  if (paidCents < expectedCents) {
    return {
      kind: 'short',
      title: `${gap} short of ${expected}`,
      text: `${formatMonthName(month)} stays ${gap} short until you edit the payment or add a correction.`,
    };
  }
  return {
    kind: 'over',
    title: `${gap} over ${expected}`,
    text: 'The extra is recorded as received. Add a correction if it should count elsewhere.',
  };
}
