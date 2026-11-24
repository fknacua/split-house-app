import { z } from 'zod';
import { dateKey, monthKey } from '../schemas/primitives';
import { badgeSchema } from './history';

/** Where the month is in its cycle. Picks the hero and the footer. */
export const homeStatusSchema = z.enum(['bill_missing', 'draft', 'unsent', 'collecting', 'bill_due', 'settled']);

/** Where the month is in its cycle. Picks the hero and the footer. */
export type HomeStatus = z.infer<typeof homeStatusSchema>;

/** Where a tap on a row link, a row action or the footer goes. Carries only the ids the target screen needs. */
export const homeTargetSchema = z.discriminatedUnion('kind', [
  /** Opens the Send message sheet in nudge mode for the person who pays the charge, with the charge ticked. */
  z.object({ kind: z.literal('send-nudge'), personId: z.string(), chargeId: z.string() }),
  /**
   * Opens the Send message sheet for the month's monthly messages. `personId` is the first person
   * whose message is not sent yet; without one the sheet opens with nobody picked in To.
   */
  z.object({ kind: z.literal('send-message'), month: monthKey, personId: z.string().optional() }),
  /** Opens Charge details for one stored charge. */
  z.object({ kind: z.literal('view-details'), chargeId: z.string() }),
  z.object({ kind: z.literal('mark-paid'), chargeId: z.string() }),
  /** Opens the Edit payment sheet for one paid charge (Charge details only). */
  z.object({ kind: z.literal('edit-payment'), chargeId: z.string() }),
  /** Opens the Add charge sheet as `Add correction` for one paid charge (Charge details only). */
  z.object({ kind: z.literal('add-correction'), chargeId: z.string() }),
  /** Opens the `Delete this correction?` dialog for a correction (Charge details only). */
  z.object({ kind: z.literal('delete-correction'), chargeId: z.string() }),
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

/** A small figure in the hero, e.g. `You're fronting` with `$X,XXX.XX`. */
export const homeTileSchema = z.object({
  label: z.string(),
  value: z.string(),
});

/** A small figure in the hero, e.g. `You're fronting` with `$X,XXX.XX`. */
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
      /** e.g. `$X,XXX.XX`. */
      value: z.string(),
      /** e.g. `Paid upfront for others · $X,XXX.XX back so far`. */
      note: z.string(),
    }),
    coverage: z.object({
      /** e.g. `Utilities bill covered`. */
      label: z.string(),
      /** e.g. `$X,XXX.XX of $X,XXX.XX`. */
      text: z.string(),
      /** 0 to 100, for the progress bar. */
      percent: z.number().int().min(0).max(100),
      /** e.g. `Your share only so far · due 16 Nov`. */
      note: z.string(),
    }),
  }),
  /** Every charge and the bill are paid: a check beside the title and two tiles. */
  z.object({
    kind: z.literal('settled'),
    /** e.g. `November is settled`. */
    title: z.string(),
    /** e.g. `Everyone’s paid. Utilities bill paid 16 Nov.` */
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
  /** `warning` is the orange Nudge button; `outline-danger` is Delete correction. */
  tone: z.enum(['primary', 'outline', 'warning', 'outline-danger']),
  /** Null for a button with a label only, like Continue. */
  icon: z.enum(['check', 'bell', 'pencil', 'plus', 'trash']).nullable(),
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
    /** e.g. `$X,XXX.XX`. The total when more than one payment is due. */
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
  /** e.g. `$X,XXX.XX`, or `—` while it depends on a bill that is not in yet. */
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

/** One button in the sticky footer. */
export const homeFooterButtonSchema = z.object({
  /** e.g. `Upload utilities bill`. */
  label: z.string(),
  icon: z.enum(['upload', 'file-pen', 'send', 'wallet', 'check']),
  /** `outline` once the button's job is done, like Send message after every monthly message is out. */
  variant: z.enum(['solid', 'outline']),
  /** The small number in the button, e.g. how many messages are not sent. Null when it shows none. */
  count: z.number().int().positive().nullable(),
  target: homeTargetSchema,
});

/** One button in the sticky footer. */
export type HomeFooterButton = z.infer<typeof homeFooterButtonSchema>;

/** The text of the Close dialog that confirms starting the next month. */
export const homeCloseDialogSchema = z.object({
  /** e.g. `Close November?`. */
  title: z.string(),
  /** e.g. `This closes November 2026 and starts December. You can’t undo this.` */
  body: z.string(),
  /** What happens next, one line each. */
  items: z.array(z.string()),
});

/** The text of the Close dialog that confirms starting the next month. */
export type HomeCloseDialog = z.infer<typeof homeCloseDialogSchema>;

/** The button that starts the next month early, with the text of the dialog it opens. */
export const homeNextMonthActionSchema = z
  .object({
    /** Always `Start next month`, whatever the months are. */
    label: z.string(),
    dialog: homeCloseDialogSchema,
  })
  .nullable();

/** The button that starts the next month early, with the text of the dialog it opens. Null unless the month is settled. */
export type HomeNextMonthAction = z.infer<typeof homeNextMonthActionSchema>;

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
  /** The sticky footer's buttons, in order. Empty when the status has none (a settled month uses `nextMonthAction`). */
  footer: z.array(homeFooterButtonSchema),
  /** The settled month's bottom button. Null in every other status. */
  nextMonthAction: homeNextMonthActionSchema,
});

/** `GET /api/home`: the newest opened month, ready to render. The server picks the month. */
export type HomeResponse = z.infer<typeof homeResponseSchema>;

/** `POST /api/home/start-next-month`: the month that was opened. */
export const startNextMonthResponseSchema = z.object({
  /** `YYYY-MM`. */
  month: monthKey,
});

/** `POST /api/home/start-next-month`: the month that was opened. */
export type StartNextMonthResponse = z.infer<typeof startNextMonthResponseSchema>;
