import { z } from 'zod';
import { monthKey } from '../schemas/primitives';
import { householdActionSchema, householdPersonSchema } from './household';
import { settingsMessageRowSchema } from './settings';

/** First run's steps, in the order of `Welcome.dc.html`. Reminders joins in Phase 13. */
export const SETUP_STEP_IDS = ['startMonth', 'rentAndRooms', 'people', 'householdSplits', 'messages'] as const;

/** One of {@link SETUP_STEP_IDS}. */
export type SetupStepId = (typeof SETUP_STEP_IDS)[number];

/** The steps `POST /api/setup/steps/:id` marks. The others are marked by their own saves. */
export const setupMarkableStepSchema = z.enum(['people', 'messages']);

/** One of the steps `POST /api/setup/steps/:id` marks. */
export type SetupMarkableStep = z.infer<typeof setupMarkableStepSchema>;

/** Where a Welcome row or button leads. The app navigates; it decides nothing. */
export const setupTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('start-month') }),
  z.object({ kind: z.literal('edit-home') }),
  z.object({ kind: z.literal('setup-people') }),
  z.object({ kind: z.literal('edit-splits') }),
  z.object({ kind: z.literal('setup-messages') }),
  /** Calls `POST /api/setup/finish`, which opens the start month; the app then goes to Home. */
  z.object({ kind: z.literal('finish') }),
]);

/** Where a Welcome row or button leads. The app navigates; it decides nothing. */
export type SetupTarget = z.infer<typeof setupTargetSchema>;

/** One segment of Welcome's progress bar: solid for a required step, hollow for an optional one. */
export const setupSegmentSchema = z.object({
  optional: z.boolean(),
  done: z.boolean(),
});

/** One segment of Welcome's progress bar. */
export type SetupSegment = z.infer<typeof setupSegmentSchema>;

/** One Welcome row. */
export const setupRowSchema = z.object({
  id: z.enum(SETUP_STEP_IDS),
  /** Shown in the dot while not done, e.g. `1`. */
  number: z.string(),
  /** e.g. `Start month`. */
  title: z.string(),
  /** e.g. `Choose the first month you want to track`. Kept when the step is done. */
  detail: z.string(),
  /** Done rows reopen, the current row is the first not done, later rows show but can't be tapped. */
  state: z.enum(['done', 'current', 'disabled']),
  /** Shows the `Optional` pill. */
  optional: z.boolean(),
  target: setupTargetSchema,
});

/** One Welcome row. */
export type SetupRow = z.infer<typeof setupRowSchema>;

/** A Welcome footer button. */
export const setupActionSchema = z.object({
  label: z.string(),
  target: setupTargetSchema,
});

/** A Welcome footer button. */
export type SetupAction = z.infer<typeof setupActionSchema>;

/** `GET /api/setup`: Welcome, ready to render. */
export const setupResponseSchema = z.object({
  /** e.g. `Set up your household`. */
  heading: z.string(),
  intro: z.string(),
  /** Null until a step is done. */
  progress: z
    .object({
      /** e.g. `1 of 5 steps done`, or `All steps done`. */
      text: z.string(),
      /** e.g. `Optional steps included`, shown on the right; null for none. */
      note: z.string().nullable(),
      /** How many steps are done, for the progress bar's value. */
      done: z.number().int().nonnegative(),
      /** One per step, in order. */
      segments: z.array(setupSegmentSchema),
    })
    .nullable(),
  rows: z.array(setupRowSchema),
  /** The main footer button, e.g. `Continue: Rent & rooms`. */
  primary: setupActionSchema,
  /** The link under it, `Not now` while Custom messages is not done; null when there is none. */
  secondary: setupActionSchema.nullable(),
});

/** `GET /api/setup`: Welcome, ready to render. */
export type SetupResponse = z.infer<typeof setupResponseSchema>;

/** One Start month card. */
export const setupStartMonthOptionSchema = z.object({
  /** `this` and `next` are radios; `other` opens the month picker. */
  id: z.enum(['this', 'next', 'other']),
  /** e.g. `This month`. */
  kicker: z.string(),
  /** The month the card stands for; null for `other` until a later month is chosen. */
  month: monthKey.nullable(),
  /** e.g. `November 2026`, or `Choose from the calendar` for `other` with no month. */
  title: z.string(),
  /** Warning text under the title, e.g. `Due dates before today start as overdue`; null for none. */
  note: z.string().nullable(),
});

/** One Start month card. */
export type SetupStartMonthOption = z.infer<typeof setupStartMonthOptionSchema>;

/** `GET /api/setup/start-month`: the Start month page, ready to render. */
export const setupStartMonthResponseSchema = z.object({
  /** This month, next month and another month, in that order. */
  options: z.array(setupStartMonthOptionSchema),
  /** The card selected on open: the saved month's, or `this` when none is saved. */
  selected: z.enum(['this', 'next', 'other']),
  /** The first month the picker allows (the month after next). It has no last month. */
  pickerFrom: monthKey,
  /** The saved start month, null until saved. A saved month now in the past reads as the current month. */
  startMonth: monthKey.nullable(),
});

/** `GET /api/setup/start-month`: the Start month page, ready to render. */
export type SetupStartMonthResponse = z.infer<typeof setupStartMonthResponseSchema>;

/** `POST /api/setup/start-month` body. */
export const setupStartMonthRequestSchema = z.object({
  /** This month or later. */
  month: monthKey,
});

/** `POST /api/setup/start-month` body. */
export type SetupStartMonthRequest = z.infer<typeof setupStartMonthRequestSchema>;

/** `POST /api/setup/finish` (no body): the month that opened. The app goes to Home. */
export const setupFinishResponseSchema = z.object({
  /** The start month, now open. */
  month: monthKey,
});

/** `POST /api/setup/finish`: the month that opened. */
export type SetupFinishResponse = z.infer<typeof setupFinishResponseSchema>;

/**
 * `POST /api/setup/start-month`, `POST /api/setup/steps/:id` and `POST /api/setup/messages/discard`: the steps now
 * done.
 */
export const setupSaveResponseSchema = z.object({
  doneSteps: z.array(z.enum(SETUP_STEP_IDS)),
});

/** `POST /api/setup/start-month` and `POST /api/setup/steps/:id`: the steps now done. */
export type SetupSaveResponse = z.infer<typeof setupSaveResponseSchema>;

/**
 * `GET /api/setup/people`: First run's People page, ready to render. The cards are Household's, with View and Edit and
 * no sub line: the primary tenant, then the tenants. The owner has no card.
 */
export const setupPeopleResponseSchema = z.object({
  /** `People`. */
  title: z.string(),
  /** `Who pays you`. */
  sub: z.string(),
  /** `People`, the list's heading. */
  heading: z.string(),
  people: z.array(householdPersonSchema),
  /** The empty card while nobody is added: `No people yet` and its `Add person` button. Null once someone is. */
  empty: z.object({ text: z.string(), add: householdActionSchema }).nullable(),
  /** `Add more`, beside the heading once someone is added. Null until then. */
  addMore: householdActionSchema.nullable(),
  /** The footer button, which marks People done through `POST /api/setup/steps/people`. */
  save: z.object({
    /** `Save people`. */
    label: z.string(),
    /** True once anyone besides the owner is in the household. */
    enabled: z.boolean(),
  }),
});

/** `GET /api/setup/people`: First run's People page, ready to render. */
export type SetupPeopleResponse = z.infer<typeof setupPeopleResponseSchema>;

/** A confirm dialog's text, e.g. `skipMessages`. */
export const setupConfirmSchema = z.object({
  /** e.g. `Skip custom messages?`. */
  title: z.string(),
  body: z.string(),
  /** e.g. `Discard templates`. */
  confirmLabel: z.string(),
  /** e.g. `Keep templates`. */
  cancelLabel: z.string(),
});

/** A confirm dialog's text. */
export type SetupConfirm = z.infer<typeof setupConfirmSchema>;

/** `GET /api/setup/messages`: First run's Custom messages page, ready to render. */
export const setupMessagesResponseSchema = z.object({
  /** `Custom messages`. */
  title: z.string(),
  /** `Optional`, under the title. */
  sub: z.string(),
  /** Monthly breakdown and Nudge, from the same builder as Settings' rows. */
  rows: z.array(settingsMessageRowSchema),
  /** `You can change these any time in Settings.` */
  note: z.string(),
  /** The footer button, which marks Custom messages done through `POST /api/setup/steps/messages`. */
  save: z.object({
    /** `Save`. */
    label: z.string(),
    /** True once anyone in the household has a custom template. */
    enabled: z.boolean(),
  }),
  /** The link under it. */
  skip: z.object({
    /** `Not now`. */
    label: z.string(),
    /**
     * The `skipMessages` dialog while a custom template exists; its confirm calls `POST /api/setup/messages/discard`.
     * Null when there is none, and `Not now` goes straight back to Welcome.
     */
    confirm: setupConfirmSchema.nullable(),
  }),
});

/** `GET /api/setup/messages`: First run's Custom messages page, ready to render. */
export type SetupMessagesResponse = z.infer<typeof setupMessagesResponseSchema>;
