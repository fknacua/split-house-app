import { z } from 'zod';
import { monthKey } from '../schemas/primitives';
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
  z.object({ kind: z.literal('edit-split') }),
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
  /** e.g. `$950.00 direct`. */
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
  /** e.g. `Own room · utilities and aircon via Priya`. */
  sub: z.string(),
  facts: z.array(householdFactSchema),
  /** The buttons in the order drawn. */
  actions: z.array(householdActionSchema),
});

/** One person's card. The owner's card comes last and reads `You`. */
export type HouseholdPerson = z.infer<typeof householdPersonSchema>;

/** One row of "Your split": rent, utilities or aircon. */
export const householdSplitRowSchema = z.object({
  /** e.g. `Rent`. */
  label: z.string(),
  /** e.g. `$3,350.00 master room · $1,675.00 each`. */
  detail: z.string(),
  /** The owner's segment of the bar, 0 to 100. The primary tenant's is the rest. */
  ownerPercent: z.number().min(0).max(100),
  /** e.g. `50 / 50`. */
  ratio: z.string(),
});

/** One row of "Your split": rent, utilities or aircon. */
export type HouseholdSplitRow = z.infer<typeof householdSplitRowSchema>;

/** The "Your split" section. */
export const householdSplitSchema = z.object({
  /** e.g. `Your split with Priya`. */
  title: z.string(),
  /** e.g. `What’s left after Sam & Jordan`. Null when the household has no subtenants. */
  sub: z.string().nullable(),
  edit: householdActionSchema,
  rows: z.array(householdSplitRowSchema),
});

/** The "Your split" section. */
export type HouseholdSplit = z.infer<typeof householdSplitSchema>;

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
  people: z.array(householdPersonSchema),
  /** Null when the household has no primary tenant, so there is no one to split with. */
  split: householdSplitSchema.nullable(),
  addPerson: householdActionSchema,
});

/** `GET /api/household`: the Household screen for one month, ready to render. */
export type HouseholdViewResponse = z.infer<typeof householdViewResponseSchema>;
