import { z } from 'zod';

import {
  personColor,
  type HouseholdAddFormResponse,
  type HouseholdAddPersonEdit,
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
  /** Only Add subtenant has this field; the split page edits it after that. */
  utilityShares: z.number().nullable(),
  /** Only Add subtenant has this field; the split page edits it after that. */
  airconUnits: z.number().nullable(),
  depositCents: z.number().nullable(),
  rentVia: z.string().nullable(),
  utilitiesVia: z.string().nullable(),
});

/** Add subtenant's checks: the amounts it cannot send empty. Every other rule is the server's, through the preview. */
export const addPersonFormSchema = personFormSchema.extend({
  utilityShares: requiredAmount,
  airconUnits: requiredAmount,
});

/**
 * The person form's values. Empty number fields are `null`. A route is `null` when paid directly, `''` when
 * Via someone is chosen but nobody is picked yet, and otherwise the person it goes via.
 */
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
    utilityShares: null,
    airconUnits: null,
    depositCents: values.amounts?.depositCents || null,
    rentVia: values.rentViaPersonId,
    utilitiesVia: values.utilitiesViaPersonId,
  };
}

/**
 * Add subtenant's starting values: everything empty and paid directly, on the server's default color.
 *
 * @param form The form response.
 * @returns The form's values.
 */
export function toAddPersonFormValues(form: HouseholdAddFormResponse): PersonFormValues {
  return {
    name: '',
    whatsapp: '',
    color: form.color,
    rentDueDay: null,
    utilitiesDueDay: null,
    rentCents: null,
    utilityShares: null,
    airconUnits: null,
    depositCents: null,
    rentVia: null,
    utilitiesVia: null,
  };
}

/** An empty field and a lone country code both mean no number. */
function whatsappOf(text: string): string | null {
  return text === '' || text === BARE_COUNTRY_CODE ? null : text;
}

/**
 * Builds the edit from what differs from the saved values. An empty rent is left out, since the schema
 * stops Save for it, and so is a route with nobody picked; an empty deposit is 0 and an empty day clears it.
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
  if (values.rentVia !== '' && values.rentVia !== loaded.rentViaPersonId) edit.rentViaPersonId = values.rentVia;
  if (values.utilitiesVia !== '' && values.utilitiesVia !== loaded.utilitiesViaPersonId) {
    edit.utilitiesViaPersonId = values.utilitiesVia;
  }

  const amounts = loaded.amounts;
  if (amounts) {
    if (values.rentCents !== null && values.rentCents !== amounts.rentCents) edit.rentCents = values.rentCents;
    const deposit = values.depositCents ?? 0;
    if (deposit !== amounts.depositCents) edit.depositCents = deposit;
  }
  return edit;
}

/**
 * Builds the new tenant from the form. An empty deposit is 0, and a route with nobody picked counts as direct,
 * since {@link hasUnpickedRoute} stops Save for it.
 *
 * @param values The form's values.
 * @returns The edit for the preview and the save.
 */
export function toAddPersonEdit(values: PersonFormValues): HouseholdAddPersonEdit {
  return {
    kind: 'addPerson',
    name: values.name,
    whatsappE164: whatsappOf(values.whatsapp),
    color: values.color,
    rentCents: values.rentCents,
    utilityShares: values.utilityShares,
    airconUnits: values.airconUnits,
    depositCents: values.depositCents ?? 0,
    rentDueDay: values.rentDueDay,
    utilitiesDueDay: values.utilitiesDueDay,
    rentViaPersonId: values.rentVia || null,
    utilitiesViaPersonId: values.utilitiesVia || null,
  };
}

/**
 * Whether leaving Add subtenant would lose anything. A lone country code is nothing typed.
 *
 * @param values The form's values.
 * @param form The form response, for the default color.
 * @returns True when a field differs from how the form opened.
 */
export function hasAddPersonInput(values: PersonFormValues, form: HouseholdAddFormResponse): boolean {
  const opened = toAddPersonFormValues(form);
  return (Object.keys(opened) as (keyof PersonFormValues)[]).some((key) =>
    key === 'whatsapp' ? whatsappOf(values.whatsapp) !== null : values[key] !== opened[key],
  );
}

/**
 * Whether a route says Via someone with nobody picked yet, which keeps Save disabled.
 *
 * @param values The form's values.
 * @returns True when either route still needs a person.
 */
export function hasUnpickedRoute(values: PersonFormValues): boolean {
  return values.rentVia === '' || values.utilitiesVia === '';
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
  const clearedAmount = form.values.amounts !== null && values.rentCents === null;
  return Object.keys(changes).length > 0 || clearedAmount || hasUnpickedRoute(values);
}
