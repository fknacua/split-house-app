/** How many of the latest saved bills the new one is compared with. */
export const UNUSUAL_BILL_HISTORY = 3;

/** How far from the average the new bill can be before it is called unusual: more than 25%, either way. */
export const UNUSUAL_BILL_THRESHOLD = 0.25;

/**
 * Warns when Current Charges is far from the recent bills: more than {@link UNUSUAL_BILL_THRESHOLD}
 * above or below their average. Only a warning, shown in the "Save with warnings?" dialog. Pure.
 *
 * @param currentChargesCents - Current Charges as typed, or `null` while empty.
 * @param recentBillsCents - Current Charges of the latest saved bills, at most {@link UNUSUAL_BILL_HISTORY}.
 * @returns The dialog line, e.g. `This bill is 32% higher than your recent bills.`, or `null` when
 * the bill is in range or there is nothing to compare with (no amount, or no saved bills yet).
 */
export function buildUnusualBillWarning(
  currentChargesCents: number | null,
  recentBillsCents: number[],
): string | null {
  if (currentChargesCents === null || currentChargesCents <= 0 || recentBillsCents.length === 0) return null;

  // Compared as sums, so the average never has to be rounded: |current - sum / n| / (sum / n).
  const count = recentBillsCents.length;
  const sum = recentBillsCents.reduce((total, cents) => total + cents, 0);
  if (sum <= 0) return null;
  const gap = currentChargesCents * count - sum;
  const ratio = Math.abs(gap) / sum;
  if (ratio <= UNUSUAL_BILL_THRESHOLD) return null;

  return `This bill is ${Math.round(ratio * 100)}% ${gap > 0 ? "higher" : "lower"} than your recent bills.`;
}
