import type { HouseholdSplitCountAmount, HouseholdSplitEdit, HouseholdSplitFormResponse } from '@splithouse/shared';

/** The server's counts on a card split by count. */
type SplitCounts = HouseholdSplitCountAmount['counts'];

/** The Household split form's values. Empty number fields are `null`. */
export interface SplitFormValues {
  tenantShares: { personId: string; utilityShares: number | null }[];
  totalShares: number | null;
  rentPrimaryBps: number | null;
  /** The primary tenant's typed count, in thousandths. Undefined until one is typed, so both follow what is left. */
  utilitiesPrimaryShares?: number | null;
  /** The same for aircon. */
  airconPrimaryUnits?: number | null;
}

const BPS_PER_PERCENT = 100;
const WHOLE = 100;
/** The slider's stops on a card split by count: half a share or unit, in thousandths. */
const COUNT_STEP = 500;

/**
 * Fills the form from the server's response.
 *
 * @param form The form response.
 * @returns The form's values.
 */
export function toSplitFormValues(form: HouseholdSplitFormResponse): SplitFormValues {
  const { tenantShares, totalShares, rentPrimaryBps } = form.values;
  return {
    tenantShares: tenantShares.map(({ personId, utilityShares }) => ({ personId, utilityShares })),
    totalShares,
    rentPrimaryBps,
  };
}

/**
 * Builds the edit from the whole form, so the server can warn about someone at 0 even when it did not change.
 * The server decides what changed and checks every field.
 *
 * @param values The form's values.
 * @returns The edit for the preview and the save.
 */
export function toSplitEdit(values: SplitFormValues): HouseholdSplitEdit {
  return { kind: 'split', ...values };
}

/**
 * Whether leaving the form would lose anything.
 *
 * @param values The form's values.
 * @param form The loaded form response.
 * @returns True when a field differs from how the form opened. A count typed back to the saved one is no change.
 */
export function hasSplitChanges(values: SplitFormValues, form: HouseholdSplitFormResponse): boolean {
  const { utilitiesPrimaryShares, airconPrimaryUnits, ...rest } = values;
  const { utilities, aircon } = form.amounts;
  const isNewCount = (typed: number | null | undefined, saved: number | null) => typed !== undefined && typed !== saved;
  return (
    isNewCount(utilitiesPrimaryShares, utilities.counts.primary) ||
    isNewCount(airconPrimaryUnits, aircon.counts.primary) ||
    JSON.stringify(rest) !== JSON.stringify(toSplitFormValues(form))
  );
}

/**
 * What a card's count fields show. Until a count is typed both come from the server, so they follow what is left.
 * Once typed, the primary tenant's stays and the owner has the rest.
 *
 * @param typed The primary tenant's typed count, null while empty, or undefined until one is typed.
 * @param counts The server's counts for the values last answered.
 * @returns Each field's count in thousandths, or null to leave it empty, as when nothing is left or one side is too high.
 */
export function shownCounts(typed: number | null | undefined, counts: SplitCounts) {
  if (typed === undefined) {
    return counts.left > 0 ? { owner: counts.owner, primary: counts.primary } : { owner: null, primary: null };
  }
  if (typed === null) return { owner: null, primary: null };
  const owner = counts.left - typed;
  return { owner: owner < 0 ? null : owner, primary: typed < 0 ? null : typed };
}

/**
 * The primary tenant's count for what was typed in the owner's field.
 *
 * @param ownerCount The owner's count, or null while the field is empty.
 * @param left What is left to split.
 * @returns The primary tenant's count, or null. The server refuses a count below 0.
 */
export function primaryCountFromOwner(ownerCount: number | null, left: number): number | null {
  return ownerCount === null ? null : left - ownerCount;
}

/**
 * The primary tenant's count for where the slider moved to. The last stop can pass what is left, so it stops there.
 *
 * @param sliderCount The owner's count at the slider's stop.
 * @param left What is left to split.
 * @returns The primary tenant's count, from 0 to what is left.
 */
export function primaryCountFromSlider(sliderCount: number, left: number): number {
  return left - Math.min(sliderCount, left);
}

/**
 * A count slider's range, in half steps from 0 up to the stop that reaches what is left, so it can go all the way.
 *
 * @param left What is left to split.
 * @returns The range, or null with nothing to split.
 */
export function sliderRangeOf(left: number) {
  if (left <= 0) return null;
  return { min: 0, max: Math.ceil(left / COUNT_STEP) * COUNT_STEP, step: COUNT_STEP };
}

/**
 * Where a count slider sits, which stays on its track whatever is typed.
 *
 * @param ownerShown The owner's field, or null while it is empty.
 * @param counts The server's counts, used while the field is empty.
 * @param range The slider's range.
 * @returns The owner's count, within the range.
 */
export function sliderCountOf(ownerShown: number | null, counts: SplitCounts, range: { min: number; max: number }): number {
  return Math.min(range.max, Math.max(range.min, ownerShown ?? counts.owner));
}

/** A percent as a field shows it, or null when there is nothing sensible to show. */
const shownPercent = (percent: number) => (percent < 0 ? null : Math.round(percent));

/**
 * The primary tenant's percent field.
 *
 * @param bps The form's basis points, or null while the field is empty.
 * @returns The whole percent, or null to leave the field empty, as when the other field holds more than 100.
 */
export function primaryPercentOf(bps: number | null): number | null {
  return bps === null ? null : shownPercent(bps / BPS_PER_PERCENT);
}

/**
 * The owner's percent field: what the primary tenant leaves.
 *
 * @param bps The form's basis points, or null while the field is empty.
 * @returns The whole percent, or null to leave the field empty, as when the other field holds more than 100.
 */
export function ownerPercentOf(bps: number | null): number | null {
  return bps === null ? null : shownPercent(WHOLE - bps / BPS_PER_PERCENT);
}

/**
 * The basis points for what was typed in the primary tenant's percent field.
 *
 * @param percent The percent, or null while the field is empty.
 * @returns The basis points, or null. The server refuses anything outside 0% to 100%.
 */
export function bpsFromPrimaryPercent(percent: number | null): number | null {
  return percent === null ? null : percent * BPS_PER_PERCENT;
}

/**
 * The basis points for what was typed in the owner's percent field, or where the slider moved to.
 *
 * @param percent The percent, or null while the field is empty.
 * @returns The basis points, or null. The server refuses anything outside 0% to 100%.
 */
export function bpsFromOwnerPercent(percent: number | null): number | null {
  return percent === null ? null : (WHOLE - percent) * BPS_PER_PERCENT;
}

/**
 * Where the percent slider sits, which stays on its track whatever is typed.
 *
 * @param bps The form's basis points, or null while the field is empty.
 * @param savedBps The saved basis points, used while the field is empty.
 * @returns The owner's percent, from 0 to 100.
 */
export function sliderPercentOf(bps: number | null, savedBps: number): number {
  const percent = WHOLE - (bps ?? savedBps) / BPS_PER_PERCENT;
  return Math.min(WHOLE, Math.max(0, Math.round(percent)));
}
