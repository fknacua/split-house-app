import { z } from 'zod';
import { dateKey, monthKey } from '../schemas/primitives';
import { badgeSchema } from './history';

/** Where the month is in its cycle. Picks the hero and the footer. */
export const homeStatusSchema = z.enum(['bill_missing', 'draft', 'unsent', 'collecting', 'settled']);

/** Where the month is in its cycle. Picks the hero and the footer. */
export type HomeStatus = z.infer<typeof homeStatusSchema>;

/** Where a tap on a row link, a row action or the footer goes. Carries only the ids the target screen needs. */
export const homeTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('recipient'), month: monthKey, personId: z.string() }),
  z.object({ kind: z.literal('mark-paid'), chargeId: z.string() }),
  z.object({ kind: z.literal('bill-upload'), month: monthKey }),
  z.object({ kind: z.literal('bill-draft-continue'), month: monthKey }),
  z.object({ kind: z.literal('bill-draft-discard'), month: monthKey }),
  z.object({ kind: z.literal('bill-view'), month: monthKey }),
  z.object({ kind: z.literal('record-payment'), month: monthKey }),
  z.object({ kind: z.literal('mark-bill-paid'), month: monthKey }),
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

/** A hero body made of a title, a line of text and two tiles. */
const homeHeroTilesBodyShape = {
  /** e.g. `Waiting on the utilities bill`. */
  title: z.string(),
  text: z.string(),
  tiles: z.tuple([homeTileSchema, homeTileSchema]),
};

/** The hero card's body. One member per kind of hero; later statuses add members. */
export const homeHeroBodySchema = z.discriminatedUnion('kind', [
  /** No bill yet: the second tile says `No bill yet`. */
  z.object({ kind: z.literal('waiting'), ...homeHeroTilesBodyShape }),
  /** The bill is in and the messages are not sent: the second tile is the bill and its due date. */
  z.object({ kind: z.literal('unsent'), ...homeHeroTilesBodyShape }),
  /** Messages are out and payments are coming in: what is fronted, and how much of the bill is covered. */
  z.object({
    kind: z.literal('collecting'),
    fronting: z.object({
      label: z.string(),
      /** e.g. `$2,725.83`. */
      value: z.string(),
      /** e.g. `Rent, aircon and other charges paid for others · $0.00 back so far`. */
      note: z.string(),
    }),
    coverage: z.object({
      /** e.g. `Utilities bill covered`. */
      label: z.string(),
      /** e.g. `$123.69 of $412.30`. */
      text: z.string(),
      /** 0 to 100, for the progress bar. */
      percent: z.number().int().min(0).max(100),
      /** e.g. `Your share only so far · due 16 Nov`. */
      note: z.string(),
    }),
  }),
  /** Every charge and the bill are paid: a check beside the title, two tiles and a footnote. */
  z.object({
    kind: z.literal('settled'),
    /** e.g. `November is settled`. */
    title: z.string(),
    /** e.g. `Everyone’s paid. Utilities bill paid 16 Nov.` */
    text: z.string(),
    tiles: z.tuple([homeTileSchema, homeTileSchema]),
    /** e.g. `December’s bill usually lands around the 2nd.` */
    footnote: z.string(),
  }),
]);

/** The hero card's body. One member per kind of hero; later statuses add members. */
export type HomeHeroBody = z.infer<typeof homeHeroBodySchema>;

/** A button inside an expanded row, or inside the hero's notice. */
export const homeActionSchema = z.object({
  /** e.g. `Mark paid`. */
  label: z.string(),
  /** `warning` is the orange Nudge button. */
  tone: z.enum(['primary', 'outline', 'warning']),
  /** Null for a button with a label only, like Continue. */
  icon: z.enum(['check', 'bell']).nullable(),
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
  /** An info Alert with one line and an amount while payments are due today. Null when none is. */
  dueToday: z.object({
    /** e.g. `Jordan’s utilities are due today`. */
    text: z.string(),
    /** e.g. `$82.46`. The total when more than one payment is due. */
    amount: z.string(),
  }).nullable(),
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
  /** How the row is shaded: `info` for due today, `warning` for overdue. `none` is the plain row. */
  tint: z.enum(['none', 'info', 'warning']),
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
    icon: z.enum(['upload', 'file-pen', 'banknote']),
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
