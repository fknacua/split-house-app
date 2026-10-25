import { z } from 'zod';
import { dateKey, monthKey } from '../schemas/primitives';
import { badgeSchema } from './history';

/** Where the month is in its cycle. Picks the hero and the footer. */
export const homeStatusSchema = z.enum(['bill_missing', 'draft']);

/** Where the month is in its cycle. Picks the hero and the footer. */
export type HomeStatus = z.infer<typeof homeStatusSchema>;

/** Where a tap on a row link, a row action or the footer goes. Carries only the ids the target screen needs. */
export const homeTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('recipient'), month: monthKey, personId: z.string() }),
  z.object({ kind: z.literal('mark-paid'), chargeId: z.string() }),
  z.object({ kind: z.literal('bill-upload'), month: monthKey }),
  z.object({ kind: z.literal('bill-draft-continue'), month: monthKey }),
  z.object({ kind: z.literal('bill-draft-discard'), month: monthKey }),
]);

/** Where a tap on a row link, a row action or the footer goes. Carries only the ids the target screen needs. */
export type HomeTarget = z.infer<typeof homeTargetSchema>;

/** One step of the month progress bar. */
export const homeStepSchema = z.object({
  /** e.g. `Upload bill`. */
  label: z.string(),
  state: z.enum(['done', 'current', 'todo']),
});

/** One step of the month progress bar. */
export type HomeStep = z.infer<typeof homeStepSchema>;

/** A small figure in the hero, e.g. `You're fronting` with `$2,725.83`. */
export const homeTileSchema = z.object({
  label: z.string(),
  value: z.string(),
});

/** A small figure in the hero, e.g. `You're fronting` with `$2,725.83`. */
export type HomeTile = z.infer<typeof homeTileSchema>;

/** The hero card's body. One member per kind of hero; later statuses add members. */
export const homeHeroBodySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('waiting'),
    /** e.g. `Waiting on the utilities bill`. */
    title: z.string(),
    text: z.string(),
    tiles: z.tuple([homeTileSchema, homeTileSchema]),
  }),
]);

/** The hero card's body. One member per kind of hero; later statuses add members. */
export type HomeHeroBody = z.infer<typeof homeHeroBodySchema>;

/** A button inside an expanded row, or inside the hero's notice. */
export const homeActionSchema = z.object({
  /** e.g. `Mark paid`. */
  label: z.string(),
  tone: z.enum(['primary', 'outline']),
  /** Null for a button with a label only, like Continue. */
  icon: z.enum(['check']).nullable(),
  target: homeTargetSchema,
});

/** A button inside an expanded row, or inside the hero's notice. */
export type HomeAction = z.infer<typeof homeActionSchema>;

/** An info Alert inside the hero card, e.g. the unfinished bill draft. */
export const homeNoticeSchema = z.object({
  /** e.g. `Unfinished bill draft`. */
  title: z.string(),
  text: z.string(),
  actions: z.array(homeActionSchema),
});

/** An info Alert inside the hero card, e.g. the unfinished bill draft. */
export type HomeNotice = z.infer<typeof homeNoticeSchema>;

/** The hero card at the top of Home. */
export const homeHeroSchema = z.object({
  /** e.g. `1 Nov · Step 1 of 3`. */
  dateLine: z.string(),
  /** Always three: upload, send, settle. */
  steps: z.array(homeStepSchema).length(3),
  /** The one-line status the pinned compact card shows once the hero scrolls away. */
  compactStatus: z.string(),
  body: homeHeroBodySchema,
  /** An info Alert at the bottom of the card, e.g. the unfinished bill draft. Null when there is none. */
  notice: homeNoticeSchema.nullable(),
});

/** The hero card at the top of Home. */
export type HomeHero = z.infer<typeof homeHeroSchema>;

/** One row of the Charges list: a charge, or the utilities bill. */
export const homeRowSchema = z.object({
  /** The charge id, or a fixed key for the bill row and for rows not created yet. Keys the row and its expanded state. */
  id: z.string(),
  /** The due date. The app shows the day and the short month beside it. Null when no due day is known. */
  dueDate: dateKey.nullable(),
  /** e.g. `Rent · Tenant 2`. */
  title: z.string(),
  /** e.g. `$950.00`, or `—` while it depends on a bill that is not in yet. */
  amount: z.string(),
  /** Small line under the title, e.g. `Pays via Primary tenant`. Null when there is nothing to add. */
  detail: z.string().nullable(),
  badge: badgeSchema,
  /** How the row is shaded. `none` is the plain row. */
  tint: z.enum(['none', 'info']),
  /** Whether the row starts open. Rows that need attention start open. */
  expanded: z.boolean(),
  /** A line inside the open row, e.g. `Worked out once the utilities bill is uploaded.` */
  note: z.string().nullable(),
  actions: z.array(homeActionSchema),
  /** The text link at the bottom of the open row, e.g. `View details`. */
  link: z.object({
    label: z.string(),
    /** Null when the screen it opens does not exist for this row, so the app shows no link. */
    target: homeTargetSchema.nullable(),
  }),
});

/** One row of the Charges list: a charge, or the utilities bill. */
export type HomeRow = z.infer<typeof homeRowSchema>;

/** The sticky footer button. Null when the status has none. */
export const homePrimaryActionSchema = z
  .object({
    /** e.g. `Upload utilities bill`. */
    label: z.string(),
    icon: z.enum(['upload', 'file-pen']),
    target: homeTargetSchema,
  })
  .nullable();

/** The sticky footer button. Null when the status has none. */
export type HomePrimaryAction = z.infer<typeof homePrimaryActionSchema>;

/** `GET /api/home`: the newest opened month, ready to render. The server picks the month. */
export const homeResponseSchema = z.object({
  /** `YYYY-MM`. */
  month: monthKey,
  /** e.g. `November 2026`. */
  monthName: z.string(),
  status: homeStatusSchema,
  hero: homeHeroSchema,
  /** One per charge, ordered by due date. */
  rows: z.array(homeRowSchema),
  primaryAction: homePrimaryActionSchema,
});

/** `GET /api/home`: the newest opened month, ready to render. The server picks the month. */
export type HomeResponse = z.infer<typeof homeResponseSchema>;
