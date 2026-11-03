import { z } from 'zod';

import {
  personColor,
  type HouseholdFormResponse,
  type HouseholdPersonEdit,
} from '@splithouse/shared';

/** What WhatsApp holds until a number is typed after it: the field's starting country code. */
const BARE_COUNTRY_CODE = '+65';

const requiredAmount = z
  .number()
  .nullable()
  // The `boolean` return keeps TypeScript from narrowing the form's value type to `number`.
  .refine((value): boolean => value !== null, 'Enter an amount.');

/**
 * The person form's checks. The device checks only that the amounts it cannot send empty are filled;
 * every other rule is the server's, through the preview.
 */
export const personFormSchema = z.object({
  name: z.string(),
  whatsapp: z.string(),
  color: personColor,
  rentDueDay: z.number().nullable(),
  utilitiesDueDay: z.number().nullable(),
  rentCents: requiredAmount,
  utilityShares: requiredAmount,
  airconUnits: requiredAmount,
  depositCents: z.number().nullable(),
});

/** The person form's values. Empty number fields are `null`; shares are thousandths. */
export type PersonFormValues = z.infer<typeof personFormSchema>;

/**
 * Fills the person form from the server's response. The owner and primary tenant have no amount fields,
 * so theirs hold 0 and are never sent. No deposit is an empty field, which shows its "None" placeholder.
 *
 * @param form The form response.
 * @returns The form's values.
 */
export function toPersonFormValues(form: HouseholdFormResponse): PersonFormValues {
  const { values } = form;
  return {
    name: values.name,
    whatsapp: values.whatsappE164 ?? '',
    color: values.color,
    rentDueDay: values.rentDueDay,
    utilitiesDueDay: values.utilitiesDueDay,
    rentCents: values.amounts?.rentCents ?? 0,
    utilityShares: values.amounts?.utilityShares ?? 0,
    airconUnits: values.amounts?.airconUnits ?? 0,
    depositCents: values.amounts?.depositCents || null,
  };
}

/** An empty field and a lone country code both mean no number. */
function whatsappOf(text: string): string | null {
  return text === '' || text === BARE_COUNTRY_CODE ? null : text;
}

/**
 * Builds the edit from what differs from the saved values. An empty rent, shares or units is left out,
 * since the schema stops Save for it; an empty deposit is 0 and an empty day clears it.
 *
 * @param values The form's values.
 * @param form The loaded form response the values are compared with.
 * @returns The edit for the preview and the save.
 */
export function toHouseholdEdit(values: PersonFormValues, form: HouseholdFormResponse): HouseholdPersonEdit {
  const loaded = form.values;
  const edit: HouseholdPersonEdit = { kind: 'person', personId: form.personId };
  if (values.name !== loaded.name) edit.name = values.name;
  const whatsapp = whatsappOf(values.whatsapp);
  if (whatsapp !== loaded.whatsappE164) edit.whatsappE164 = whatsapp;
  if (values.color !== loaded.color) edit.color = values.color;
  if (values.rentDueDay !== loaded.rentDueDay) edit.rentDueDay = values.rentDueDay;
  if (values.utilitiesDueDay !== loaded.utilitiesDueDay) edit.utilitiesDueDay = values.utilitiesDueDay;

  const amounts = loaded.amounts;
  if (amounts) {
    if (values.rentCents !== null && values.rentCents !== amounts.rentCents) edit.rentCents = values.rentCents;
    if (values.utilityShares !== null && values.utilityShares !== amounts.utilityShares) {
      edit.utilityShares = values.utilityShares;
    }
    if (values.airconUnits !== null && values.airconUnits !== amounts.airconUnits) edit.airconUnits = values.airconUnits;
    const deposit = values.depositCents ?? 0;
    if (deposit !== amounts.depositCents) edit.depositCents = deposit;
  }
  return edit;
}

/**
 * Whether leaving the form would lose anything.
 *
 * @param values The form's values.
 * @param form The loaded form response.
 * @returns True when a field differs from the saved values.
 */
export function hasUnsavedChanges(values: PersonFormValues, form: HouseholdFormResponse): boolean {
  const { kind, personId, ...changes } = toHouseholdEdit(values, form);
  const clearedAmount =
    form.values.amounts !== null &&
    (values.rentCents === null || values.utilityShares === null || values.airconUnits === null);
  return Object.keys(changes).length > 0 || clearedAmount;
}
