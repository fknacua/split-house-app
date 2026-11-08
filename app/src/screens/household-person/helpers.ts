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

/** The person form's fields. Every rule on them is the server's, through the preview. */
export const personFormSchema = z.object({
  name: z.string(),
  whatsapp: z.string(),
  color: personColor,
  rentDueDay: z.number().nullable(),
  utilitiesDueDay: z.number().nullable(),
  /** Only Add subtenant has this field; the split page edits it after that. */
  utilityShares: z.number().nullable(),
  /** Only Add subtenant has this field, and `''` means none is picked yet. A tenant's room never changes after that. */
  roomId: z.string(),
  depositCents: z.number().nullable(),
  rentVia: z.string().nullable(),
  utilitiesVia: z.string().nullable(),
});

/**
 * Add subtenant's checks: the room, and the shares unless the room makes them the primary tenant, whose shares come
 * from the split. Every other rule is the server's, through the preview.
 *
 * @param rooms The rooms the form offers.
 * @returns The schema for the form's resolver.
 */
export function addPersonFormSchemaFor(rooms: HouseholdAddFormResponse['rooms']) {
  return personFormSchema
    .extend({ roomId: z.string().min(1, 'Choose a room.') })
    .superRefine((values, ctx) => {
      if (isPrimaryRoom(rooms, values.roomId) || values.utilityShares !== null) return;
      ctx.addIssue({ code: 'custom', path: ['utilityShares'], message: 'Enter an amount.' });
    });
}

/** Add subtenant's checks with only tenant rooms on offer, as outside First run. */
export const addPersonFormSchema = addPersonFormSchemaFor([]);

/**
 * Whether the picked room makes the new person the primary tenant: the master room, offered in First run.
 *
 * @param rooms The rooms the form offers.
 * @param roomId The picked room, or `''` for none.
 * @returns True for the master room.
 */
export function isPrimaryRoom(rooms: HouseholdAddFormResponse['rooms'], roomId: string): boolean {
  return rooms.some((room) => room.id === roomId && room.role === 'PRIMARY');
}

/**
 * The person form's values. Empty number fields are `null`. A route is `null` when paid directly, `''` when
 * Via someone is chosen but nobody is picked yet, and otherwise the person it goes via.
 */
export type PersonFormValues = z.infer<typeof personFormSchema>;

/**
 * Fills the person form from the server's response. No deposit is an empty field, which shows its "None"
 * placeholder. The owner and primary tenant have no such field, and theirs is never sent.
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
    utilityShares: null,
    roomId: '',
    depositCents: values.depositCents || null,
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
    utilityShares: null,
    roomId: '',
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
 * Builds the edit from what differs from the saved values. A route with nobody picked is left out; an empty deposit
 * is 0 and an empty day clears it.
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

  const deposit = values.depositCents ?? 0;
  if (loaded.depositCents !== null && deposit !== loaded.depositCents) edit.depositCents = deposit;
  return edit;
}

/**
 * Builds the new person from the form. An empty deposit is 0, and a route with nobody picked counts as direct,
 * since {@link hasUnpickedRoute} stops Save for it. A primary tenant sends no shares, no deposit and no routes,
 * whatever the hidden fields still hold.
 *
 * @param values The form's values.
 * @param primary Whether the picked room makes them the primary tenant.
 * @returns The edit for the preview and the save.
 */
export function toAddPersonEdit(values: PersonFormValues, primary = false): HouseholdAddPersonEdit {
  if (primary) {
    return {
      ...toAddPersonEdit(values),
      utilityShares: null,
      depositCents: 0,
      rentViaPersonId: null,
      utilitiesViaPersonId: null,
    };
  }
  return {
    kind: 'addPerson',
    name: values.name,
    whatsappE164: whatsappOf(values.whatsapp),
    color: values.color,
    roomId: values.roomId || null,
    utilityShares: values.utilityShares,
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
 * @param primary Whether the picked room makes them the primary tenant, who has no routes to pick.
 * @returns True when either route still needs a person.
 */
export function hasUnpickedRoute(values: PersonFormValues, primary = false): boolean {
  return !primary && (values.rentVia === '' || values.utilitiesVia === '');
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
  return Object.keys(changes).length > 0 || hasUnpickedRoute(values);
}
