import type { HouseholdRecurringCharge, HouseholdRecurringEdit } from '@splithouse/shared';

/** The recurring charge sheet's values. An empty amount is `null`, and an empty select or month is `''`. */
export interface RecurringFormValues {
  label: string;
  amountCents: number | null;
  personId: string;
  endMonth: string;
}

/**
 * Fills the sheet.
 *
 * @param charge The saved charge, or null for a new one.
 * @returns The sheet's values.
 */
export function toRecurringValues(charge: HouseholdRecurringCharge | null): RecurringFormValues {
  return {
    label: charge?.label ?? '',
    amountCents: charge?.amountCents ?? null,
    personId: charge?.personId ?? '',
    endMonth: charge?.endMonth ?? '',
  };
}

/**
 * Builds the edit from the sheet. The server decides what changed and checks every field.
 *
 * @param values The sheet's values.
 * @param chargeId The saved charge, or null for a new one.
 * @returns The edit for the preview and the save.
 */
export function toRecurringEdit(values: RecurringFormValues, chargeId: string | null): HouseholdRecurringEdit {
  return {
    kind: 'recurring',
    chargeId,
    label: values.label,
    amountCents: values.amountCents,
    personId: values.personId === '' ? null : values.personId,
    endMonth: values.endMonth === '' ? null : values.endMonth,
  };
}
