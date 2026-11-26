/** How many of the latest saved bills the new one is compared with. */
export const UNUSUAL_BILL_HISTORY = 3;

/** How far from the average the new bill can be before it is called unusual: more than 25%, either way. */
export const UNUSUAL_BILL_THRESHOLD = 0.25;

/** How far an unusual bill is from the recent bills' average. */
export interface UnusualBillChange {
  /** The gap as a whole percentage of the average, e.g. `32`. */
  percent: number;
  direction: "higher" | "lower";
}

/**
 * Whether Current Charges is far from the recent bills: more than {@link UNUSUAL_BILL_THRESHOLD} above or below their
 * average. The upload warning and the Unusual bill amount FYI both use it. Pure.
 *
 * @param currentChargesCents - Current Charges, or `null` while empty.
 * @param recentBillsCents - Current Charges of the latest saved bills, at most {@link UNUSUAL_BILL_HISTORY}.
 * @returns How far it is from the average, or `null` when the bill is in range or there is nothing to compare with
 * (no amount, or no saved bills yet).
 */
export function unusualBillChange(
  currentChargesCents: number | null,
  recentBillsCents: number[],
): UnusualBillChange | null {
  if (currentChargesCents === null || currentChargesCents <= 0 || recentBillsCents.length === 0) return null;

  // Compared as sums, so the average never has to be rounded: |current - sum / n| / (sum / n).
  const count = recentBillsCents.length;
  const sum = recentBillsCents.reduce((total, cents) => total + cents, 0);
  if (sum <= 0) return null;
  const gap = currentChargesCents * count - sum;
  const ratio = Math.abs(gap) / sum;
  if (ratio <= UNUSUAL_BILL_THRESHOLD) return null;

  return { percent: Math.round(ratio * 100), direction: gap > 0 ? "higher" : "lower" };
}

/**
 * Warns when Current Charges is far from the recent bills (see {@link unusualBillChange}). Only a warning, shown in
 * the "Save with warnings?" dialog. Pure.
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
  const change = unusualBillChange(currentChargesCents, recentBillsCents);
  return change ? `This bill is ${change.percent}% ${change.direction} than your recent bills.` : null;
}
