import { formatMonthShort } from "@splithouse/shared";

/** The charge a correction fixes, as much of it as its name needs. */
export interface CorrectedCharge {
  label: string;
  month: string;
}

/**
 * What a correction fixes, short: the corrected charge's label and month, e.g. `Utilities Sep` or `Fridge repair Oct`.
 *
 * @param fixed - The charge the correction fixes.
 * @returns The short text.
 */
export function correctionFixes(fixed: CorrectedCharge): string {
  return `${fixed.label} ${formatMonthShort(fixed.month)}`;
}

/**
 * A correction's name on one line, where a row or a field names a charge: `Correction · Utilities Sep`, in place of its
 * stored label (`Utilities correction (Sep)`), which runs long. It already says the month it fixes, so callers leave
 * their own month off.
 *
 * @param fixed - The charge a correction fixes, or null (or left out) for any other charge.
 * @returns The name, or null for a charge that isn't a correction.
 */
export function correctionName(fixed: CorrectedCharge | null | undefined): string | null {
  return fixed ? `Correction · ${correctionFixes(fixed)}` : null;
}
