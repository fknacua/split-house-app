import { z } from 'zod';
import { monthKey } from '../schemas/primitives';
import { badgeSchema } from './history';
import { messagePreviewSchema } from './messages';

/** The Send message sheet's two modes: the monthly breakdown, or a nudge about overdue charges. */
export const sendModeSchema = z.enum(['monthly', 'nudge']);

/** The Send message sheet's two modes. */
export type SendMode = z.infer<typeof sendModeSchema>;

/**
 * `GET /api/send` query. The sheet is always about the active month.
 * - `personId`: who is picked in To; left out, the sheet opens with nobody picked.
 * - `chargeId`: in nudge mode, the overdue charge that was tapped, ticked when the sheet opens. When it is
 *   not one of the person's overdue charges (or left out), their earliest-due overdue charge is ticked.
 */
export const sendQuerySchema = z.object({
  mode: sendModeSchema,
  personId: z.string().min(1).optional(),
  chargeId: z.string().min(1).optional(),
});

/** `GET /api/send` query. */
export type SendQuery = z.infer<typeof sendQuerySchema>;

/**
 * `POST /api/send/preview`: the nudge sheet again with a changed set of ticked charges. Ids that are not
 * the person's overdue charges are left out; an empty list ticks nothing. A changed person is a new
 * `GET /api/send` instead.
 */
export const sendPreviewRequestSchema = z.object({
  personId: z.string().min(1),
  chargeIds: z.array(z.string().min(1)),
});

/** `POST /api/send/preview` body. */
export type SendPreviewRequest = z.infer<typeof sendPreviewRequestSchema>;

/** One person in the To list. */
export const sendToOptionSchema = z.object({
  personId: z.string(),
  name: z.string(),
  /** e.g. `Monthly message not sent` or `Sent 2 Nov`; in nudge mode `2 overdue · $X,XXX.XX`. */
  detail: z.string(),
  /** `danger` for the overdue detail in nudge mode. */
  tone: z.enum(['default', 'danger']),
});

/** One person in the To list. */
export type SendToOption = z.infer<typeof sendToOptionSchema>;

/** One charge under the monthly Total, once expanded. */
export const sendTotalRowSchema = z.object({
  /** e.g. `Rent · Nov`, or `Utilities · Sam · Nov` for a charge collected through this person. */
  title: z.string(),
  /** e.g. `$X,XXX.XX`; a credit reads `-$X,XXX.XX`. */
  amount: z.string(),
});

/** Monthly mode's Total card: what the message asks for, expanding to its charges. */
export const sendTotalCardSchema = z.object({
  /** e.g. `$X,XXX.XX`. */
  amount: z.string(),
  /** e.g. `6 charges · due 7 Nov`. */
  sub: z.string(),
  /** e.g. `Pays for: Sam`; null when the person collects for nobody. */
  paysFor: z.string().nullable(),
  /** `Not sent`, `Sent · unpaid` or `Paid`. */
  chip: badgeSchema,
  /** Their own charges first, then the ones they collect; largest first within each. */
  rows: z.array(sendTotalRowSchema),
});

/** Monthly mode's Total card. */
export type SendTotalCard = z.infer<typeof sendTotalCardSchema>;

/** One overdue charge in nudge mode's card, with its Checkbox. */
export const sendChargeRowSchema = z.object({
  chargeId: z.string(),
  /** e.g. `Rent · Nov`, or `Utilities · Sam · Nov` for a charge collected through this person. */
  title: z.string(),
  /** e.g. `$X,XXX.XX`. */
  amount: z.string(),
  /** e.g. `Due 1 Nov`. */
  detail: z.string(),
  /** e.g. `Overdue 2 days`. */
  chip: badgeSchema,
  ticked: z.boolean(),
});

/** One overdue charge in nudge mode's card. */
export type SendChargeRow = z.infer<typeof sendChargeRowSchema>;

/** Nudge mode's charge card: the ticked total, expanding to tick more when two or more are overdue. */
export const sendChargesCardSchema = z.object({
  /** `Charge` for one overdue charge, `Overdue charges` for more. */
  label: z.string(),
  /** The ticked charges' total, e.g. `$X,XXX.XX`. */
  amount: z.string(),
  /** The one ticked charge's title, `2 charges`, or `No charge selected`. */
  sub: z.string(),
  /** e.g. `1 of 3 overdue selected`; null with one overdue charge. */
  selected: z.string().nullable(),
  /** The longest-overdue ticked charge's chip; null when nothing is ticked. */
  chip: badgeSchema.nullable(),
  /** True with two or more overdue charges: the card opens to the rows. */
  expandable: z.boolean(),
  /** Every overdue charge, earliest due first. */
  rows: z.array(sendChargeRowSchema),
});

/** Nudge mode's charge card. */
export type SendChargesCard = z.infer<typeof sendChargesCardSchema>;

/** The history card: when the message (or a nudge about a ticked charge) went out before. Dates only. */
export const sendHistorySchema = z.object({
  /** `Sent` or `Nudges`. */
  title: z.string(),
  /** Oldest first: `Sent` then `Sent again`, or `Nudged` then `Nudged again`. */
  rows: z.array(z.object({ label: z.string(), date: z.string() })).min(1),
});

/** The history card. */
export type SendHistory = z.infer<typeof sendHistorySchema>;

/** Opens the template editor: the person's custom template when they have one, else the Default. */
export const sendEditTemplateTargetSchema = z.object({
  kind: z.literal('edit-template'),
  template: z.enum(['MONTHLY', 'NUDGE']),
  /** Set when the person has a custom template of this kind. */
  personId: z.string().optional(),
});

/** The message card. */
export const sendMessageCardSchema = z.object({
  /** `Message`. */
  label: z.string(),
  /** `Monthly breakdown template` or `Nudge template`. */
  meta: z.string(),
  /** The message as it is sent; null when nothing is ticked. */
  preview: messagePreviewSchema.nullable(),
  /** Stands in for the preview when it is null, e.g. `Pick at least one charge to see the message.` */
  empty: z.string().nullable(),
  editTemplate: z.object({ label: z.string(), target: sendEditTemplateTargetSchema }),
});

/** The message card. */
export type SendMessageCard = z.infer<typeof sendMessageCardSchema>;

/**
 * `POST /api/send/events`: records that a message went out on WhatsApp, once Francis confirms it was sent. The server
 * renders and stores the message text itself.
 */
export const sendEventRequestSchema = z.discriminatedUnion('kind', [
  /** The monthly breakdown (Send on WhatsApp, Send again). */
  z.object({ kind: z.literal('MONTHLY'), month: monthKey, personId: z.string().min(1) }),
  /** A nudge about one or more of the person's charges: one NUDGE event per charge, all at the same moment. */
  z.object({
    kind: z.literal('NUDGE'),
    month: monthKey,
    personId: z.string().min(1),
    chargeIds: z
      .array(z.string().min(1))
      .min(1)
      .refine((ids) => new Set(ids).size === ids.length, 'Each charge may be named once.'),
  }),
]);

/** `POST /api/send/events`: records that a message went out on WhatsApp. */
export type SendEventRequest = z.infer<typeof sendEventRequestSchema>;

/** One recorded message event. */
export const messageEventSchema = z.object({
  id: z.string(),
  kind: z.enum(['MONTHLY', 'NUDGE']),
  /** The nudged charge; null for a monthly message. */
  chargeId: z.string().nullable(),
  /** When the send was recorded, as an ISO timestamp. */
  openedAt: z.iso.datetime({ offset: true }),
});

/** One recorded message event. Not `MessageEvent`, which the DOM and Prisma already name. */
export type MessageEventRecord = z.infer<typeof messageEventSchema>;

/** `POST /api/send/events`: the recorded events, one for a monthly message and one per charge for a nudge. */
export const messageEventResponseSchema = z.object({
  events: z.array(messageEventSchema).min(1),
});

/** `POST /api/send/events`: the recorded events. */
export type MessageEventResponse = z.infer<typeof messageEventResponseSchema>;

/**
 * Opens the person's WhatsApp chat at `url` (`https://wa.me/...` with the message filled in). Once Francis confirms it
 * was sent, the app posts `record` to `POST /api/send/events` as it is.
 */
export const sendWhatsappTargetSchema = z.object({
  kind: z.literal('send-whatsapp'),
  url: z.url(),
  record: sendEventRequestSchema,
});

/** Opens WhatsApp with the message, then records it. */
export type SendWhatsappTarget = z.infer<typeof sendWhatsappTargetSchema>;

/** `GET /api/send` and `POST /api/send/preview`: the Send message sheet, ready to render. */
export const sendResponseSchema = z.object({
  mode: sendModeSchema,
  /** The active month. */
  month: monthKey,
  /** `Send message` or `Send nudge message`. */
  title: z.string(),
  /** e.g. `Nov 2026`. */
  subtitle: z.string(),
  to: z.object({
    /** Who is picked; null when nobody is. */
    personId: z.string().nullable(),
    /** Shown in the To field while nobody is picked. */
    placeholder: z.string(),
    /**
     * Monthly mode: everyone who gets a monthly message. Nudge mode: everyone with an overdue charge
     * after their monthly message went out. Never someone who pays via another person.
     */
    options: z.array(sendToOptionSchema),
  }),
  /** Monthly mode's Total card; null in nudge mode or with nobody picked. */
  total: sendTotalCardSchema.nullable(),
  /** Nudge mode's charge card; null in monthly mode or with nobody picked. */
  charges: sendChargesCardSchema.nullable(),
  /** Null until the message (or a nudge about a ticked charge) has gone out. */
  history: sendHistorySchema.nullable(),
  /** Null with nobody picked. */
  message: sendMessageCardSchema.nullable(),
  /** e.g. `No WhatsApp number is set up for Jordan.`, above the footer; null when there is nothing to say. */
  note: z.string().nullable(),
  send: z.object({
    /** `Send on WhatsApp`, then `Send again` or `Nudge again` once it has gone out. */
    label: z.string(),
    /** Null while Send can't be used: nobody picked, no WhatsApp number, no bill yet, or nothing ticked. */
    target: sendWhatsappTargetSchema.nullable(),
  }),
  shareBill: z.object({
    /** `Share bill`. */
    label: z.string(),
    /** False before the month's bill is saved. */
    enabled: z.boolean(),
    target: z.object({ kind: z.literal('share-bill'), month: monthKey }),
  }),
});

/** `GET /api/send` and `POST /api/send/preview`: the Send message sheet, ready to render. */
export type SendResponse = z.infer<typeof sendResponseSchema>;
