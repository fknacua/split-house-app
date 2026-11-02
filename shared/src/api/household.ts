import { z } from 'zod';
import { monthKey, personColor } from '../schemas/primitives';
import { badgeSchema } from './history';

/** `GET /api/household` query: the month to show. Missing means the active month. */
export const householdViewQuerySchema = z.object({
  month: monthKey.optional(),
});

/** `GET /api/household` query: the month to show. Missing means the active month. */
export type HouseholdViewQuery = z.infer<typeof householdViewQuerySchema>;

/** Where a Household button leads. The app navigates; it decides nothing. */
export const householdTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('edit-home') }),
  z.object({ kind: z.literal('edit-person'), personId: z.string() }),
  z.object({ kind: z.literal('view-person'), personId: z.string() }),
  z.object({ kind: z.literal('add-person') }),
]);

/** Where a Household button leads. The app navigates; it decides nothing. */
export type HouseholdTarget = z.infer<typeof householdTargetSchema>;

/** A button on the Household screen. */
export const householdActionSchema = z.object({
  /** e.g. `Edit split`. */
  label: z.string(),
  target: householdTargetSchema,
});

/** A button on the Household screen. */
export type HouseholdAction = z.infer<typeof householdActionSchema>;

/** One entry in the "Showing:" month list. */
export const householdMonthOptionSchema = z.object({
  /** `YYYY-MM`. The app asks for this month when it is picked. */
  month: monthKey,
  /** e.g. `Nov 2026`. */
  label: z.string(),
  /** `Upcoming` for a month after the active one; otherwise null. */
  badge: badgeSchema.nullable(),
});

/** One entry in the "Showing:" month list. */
export type HouseholdMonthOption = z.infer<typeof householdMonthOptionSchema>;

/** A small stat tile on the landlord card. */
export const householdStatSchema = z.object({
  /** e.g. `6`. */
  value: z.string(),
  /** e.g. `aircon units`. */
  label: z.string(),
});

/** A small stat tile on the landlord card. */
export type HouseholdStat = z.infer<typeof householdStatSchema>;

/** A label and value on a person's card. */
export const householdFactSchema = z.object({
  /** e.g. `Rent · due 28th`. */
  label: z.string(),
  /** e.g. `$950.00`. */
  value: z.string(),
});

/** A label and value on a person's card. */
export type HouseholdFact = z.infer<typeof householdFactSchema>;

/** One person's card. The owner's card comes last and reads `You`. */
export const householdPersonSchema = z.object({
  personId: z.string(),
  /** e.g. `S`. */
  initial: z.string(),
  name: z.string(),
  /** The avatar's fill. */
  color: personColor,
  /** e.g. `Own room · utilities and aircon via Priya`. */
  sub: z.string(),
  facts: z.array(householdFactSchema),
  /** The buttons in the order drawn. Empty on the owner's card. */
  actions: z.array(householdActionSchema),
});

/** One person's card. The owner's card comes last and reads `You`. */
export type HouseholdPerson = z.infer<typeof householdPersonSchema>;

/** One person's part of a Household split row: a bar segment and a legend entry. */
export const householdSplitSegmentSchema = z.object({
  personId: z.string(),
  /** e.g. `Priya`, or `You` for the owner. */
  name: z.string(),
  /** e.g. `$1,675.00`, `1.5`. */
  value: z.string(),
  /** The segment's width, 0 to 100. A person at 0 has no segment but stays in the legend. */
  percent: z.number().min(0).max(100),
  color: personColor,
});

/** One person's part of a Household split row: a bar segment and a legend entry. */
export type HouseholdSplitSegment = z.infer<typeof householdSplitSegmentSchema>;

/** One row of "Household split": rent, utilities or aircon, across everyone. */
export const householdSplitRowSchema = z.object({
  /** e.g. `Rent`. */
  label: z.string(),
  /** The total, e.g. `$5,250.00 across the home`, `5 shares`. */
  detail: z.string(),
  /** The owner first, then the primary tenant, then the tenants. */
  segments: z.array(householdSplitSegmentSchema),
  /** The bar read out, e.g. `Rent: You $1,675.00, Priya $1,675.00`. */
  accessibilityLabel: z.string(),
});

/** One row of "Household split": rent, utilities or aircon, across everyone. */
export type HouseholdSplitRow = z.infer<typeof householdSplitRowSchema>;

/** `GET /api/household`: the Household screen for one month, ready to render. */
export const householdViewResponseSchema = z.object({
  /** `YYYY-MM`. The month shown. */
  month: monthKey,
  /** e.g. `Nov 2026`, for "Showing:". */
  monthLabel: z.string(),
  /** Newest first. */
  monthOptions: z.array(householdMonthOptionSchema),
  landlord: z.object({
    stats: z.array(householdStatSchema),
    edit: householdActionSchema,
  }),
  /** The "Household split" rows: rent, utilities and aircon. */
  splitRows: z.array(householdSplitRowSchema),
  people: z.array(householdPersonSchema),
  addPerson: householdActionSchema,
});

/** `GET /api/household`: the Household screen for one month, ready to render. */
export type HouseholdViewResponse = z.infer<typeof householdViewResponseSchema>;

/** `GET /api/household/form` query: the person, and the month to read. Missing means the first Starts from option. */
export const householdFormQuerySchema = z.object({
  personId: z.string().min(1),
  month: monthKey.optional(),
});

/** `GET /api/household/form` query: the person, and the month to read. Missing means the first Starts from option. */
export type HouseholdFormQuery = z.infer<typeof householdFormQuerySchema>;

/** A label and its plain text on a View screen. */
export const householdFormTextRowSchema = z.object({
  /** e.g. `Rent (SGD)`. */
  label: z.string(),
  /** e.g. `1,000.00`, `None`, `—`. */
  value: z.string(),
});

/** A label and its plain text on a View screen. */
export type HouseholdFormTextRow = z.infer<typeof householdFormTextRowSchema>;

/** `GET /api/household/form`: one person's Edit and View screens for one month, ready to render. */
export const householdFormResponseSchema = z.object({
  personId: z.string(),
  /** e.g. `Edit Jordan`. */
  title: z.string(),
  /** The View screen's title, e.g. `Jordan`. */
  viewTitle: z.string(),
  /** e.g. `Own room · pays you directly`. */
  sub: z.string(),
  /** `YYYY-MM`. The month the values were read from. */
  month: monthKey,
  /** The Starts from option to select: `month` when it is one, otherwise the first. */
  startsFrom: monthKey,
  /** The months after the active one, oldest first. */
  startsFromOptions: z.array(monthKey),
  /** The form's values. Shares are thousandths; a route's person is null when it is paid directly. */
  values: z.object({
    name: z.string(),
    whatsappE164: z.string().nullable(),
    color: personColor,
    rentDueDay: z.number().int().nullable(),
    utilitiesDueDay: z.number().int().nullable(),
    rentViaPersonId: z.string().nullable(),
    utilitiesViaPersonId: z.string().nullable(),
    /** Null for the owner and the primary tenant, whose amounts come from the split. */
    amounts: z
      .object({
        rentCents: z.number().int(),
        utilityShares: z.number().int(),
        airconUnits: z.number().int(),
        depositCents: z.number().int(),
      })
      .nullable(),
  }),
  /** e.g. `Green`, beside the Color label. */
  colorName: z.string(),
  /** The colors that can be picked, in the order drawn. Teal is only offered to the owner. */
  swatches: z.array(z.object({ color: personColor, name: z.string() })),
  /** Who a charge can be sent via: everyone in the month's version but this person and the owner. */
  sentViaOptions: z.array(z.object({ personId: z.string(), name: z.string() })),
  /** The View screen's text, by section. */
  view: z.object({
    details: z.array(householdFormTextRowSchema),
    amounts: z.array(householdFormTextRowSchema),
    routes: z.array(householdFormTextRowSchema),
  }),
  /** The link under Save. */
  secondaryAction: z.object({
    label: z.string(),
    kind: z.enum(['remove-person', 'cancel']),
  }),
});

/** `GET /api/household/form`: one person's Edit and View screens for one month, ready to render. */
export type HouseholdFormResponse = z.infer<typeof householdFormResponseSchema>;

/**
 * An edit to one person. Only the fields sent are applied. The rules on the values (a required name,
 * a valid number, day 1 to 31) are checked by the server so the preview can answer per field.
 */
export const householdPersonEditSchema = z.object({
  kind: z.literal('person'),
  personId: z.string().min(1),
  /** The month the dated fields start from. */
  startsFromMonth: monthKey,
  // Saved right away, on the person.
  name: z.string().optional(),
  whatsappE164: z.string().nullable().optional(),
  color: personColor.optional(),
  // Saved from the chosen month, on the version.
  rentCents: z.number().int().optional(),
  /** Thousandths: 1.5 shares is 1500. */
  utilityShares: z.number().int().optional(),
  airconUnits: z.number().int().optional(),
  depositCents: z.number().int().optional(),
  /** Null clears the day. */
  rentDueDay: z.number().int().nullable().optional(),
  /** Also sets the aircon due day. Null clears both. */
  utilitiesDueDay: z.number().int().nullable().optional(),
});

/** An edit to one person. Only the fields sent are applied. */
export type HouseholdPersonEdit = z.infer<typeof householdPersonEditSchema>;

/** `POST /api/household/edits` and `.../preview` body: one typed edit. The app never sends a config. */
export const householdEditSchema = z.discriminatedUnion('kind', [householdPersonEditSchema]);

/** `POST /api/household/edits` and `.../preview` body: one typed edit. The app never sends a config. */
export type HouseholdEdit = z.infer<typeof householdEditSchema>;

/** One changed value in the summary card. */
export const householdEditRowSchema = z.object({
  /** e.g. `Jordan rent`. */
  label: z.string(),
  /** e.g. `$950.00`. */
  from: z.string(),
  /** e.g. `$1,000.00`. */
  to: z.string(),
});

/** One changed value in the summary card. */
export type HouseholdEditRow = z.infer<typeof householdEditRowSchema>;

/** A group in the summary card. A group with no rows is left out. */
export const householdEditGroupSchema = z.object({
  /** `Saves now` or `Saves from Jan 2027`. */
  title: z.string(),
  rows: z.array(householdEditRowSchema),
});

/** A group in the summary card. A group with no rows is left out. */
export type HouseholdEditGroup = z.infer<typeof householdEditGroupSchema>;

/** `POST /api/household/edits/preview`: what the edit would change. Nothing is stored. */
export const householdEditPreviewResponseSchema = z.object({
  /** Empty hides the summary card. */
  groups: z.array(householdEditGroupSchema),
  /** Whether Save would store something, with no errors. */
  canSave: z.boolean(),
  /** Messages by request field name; `form` for one that belongs to no field. */
  errors: z.record(z.string(), z.string()),
  /** e.g. `March 2027 keeps its own values, so this change stops there.` */
  laterVersionWarning: z.string().nullable(),
});

/** `POST /api/household/edits/preview`: what the edit would change. Nothing is stored. */
export type HouseholdEditPreviewResponse = z.infer<typeof householdEditPreviewResponseSchema>;

/** `POST /api/household/edits`: what was stored. */
export const householdEditSaveResponseSchema = z.object({
  /** The version's starts-from month, or null when only name, WhatsApp or color changed. */
  savedFromMonth: monthKey.nullable(),
});

/** `POST /api/household/edits`: what was stored. */
export type HouseholdEditSaveResponse = z.infer<typeof householdEditSaveResponseSchema>;
