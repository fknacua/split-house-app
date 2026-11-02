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
