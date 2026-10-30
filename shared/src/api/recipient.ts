import { z } from 'zod';
import { monthKey } from '../schemas/primitives';
import { badgeSchema } from './history';

/**
 * Opens the person's WhatsApp chat with a nudge about one charge, then records a NUDGE message event
 * on it. `url` is the `https://wa.me/...` link with the nudge filled in; null when the person has no
 * WhatsApp number, and the button is then disabled.
 */
export const recipientNudgeTargetSchema = z.object({
  kind: z.literal('nudge-whatsapp'),
  month: monthKey,
  personId: z.string(),
  chargeId: z.string(),
  url: z.url().nullable(),
});

/** Opens WhatsApp with a nudge about one charge, then records it. */
export type RecipientNudgeTarget = z.infer<typeof recipientNudgeTargetSchema>;

/** One paid charge in Edit payment's For list. */
export const recipientPaidChargeSchema = z.object({
  chargeId: z.string(),
  /** e.g. `Rent`, or `Utilities · Sam` for a charge paid through this person. */
  title: z.string(),
  /** What was received, e.g. `$1,611.35`. */
  received: z.string(),
  /** e.g. `Paid 27 Nov`, or `Paid 27 Nov · $63.65 short` when it differs from what was asked. */
  detail: z.string(),
});

/** One paid charge in Edit payment's For list. */
export type RecipientPaidCharge = z.infer<typeof recipientPaidChargeSchema>;

/** Where a Recipient button goes. Carries only what the target needs. */
export const recipientTargetSchema = z.discriminatedUnion('kind', [
  /**
   * Opens the person's WhatsApp chat with the monthly message, then records a MONTHLY message event.
   * `url` is the `https://wa.me/...` link with the message filled in; null when the person has no
   * WhatsApp number, and the button is then disabled.
   */
  z.object({ kind: z.literal('send-whatsapp'), month: monthKey, personId: z.string(), url: z.url().nullable() }),
  recipientNudgeTargetSchema,
  /**
   * Opens the "Nudge about which charge?" sheet, listing the charge rows that carry a `nudge`. Used by
   * Nudge again when no charge was chosen and two or more are overdue.
   */
  z.object({ kind: z.literal('choose-nudge'), month: monthKey, personId: z.string() }),
  /** Opens Record payment (7.3) with this person chosen, and with `chargeId` chosen when given. */
  z.object({ kind: z.literal('record-payment'), month: monthKey, personId: z.string(), chargeId: z.string().optional() }),
  /**
   * Opens Edit payment on `chargeId`, filled in with its stored payment (7.1's sheet). With two or
   * more `charges`, a For list picks which payment to edit.
   */
  z.object({
    kind: z.literal('edit-payment'),
    chargeId: z.string(),
    charges: z.array(recipientPaidChargeSchema).min(1),
  }),
  /** Opens Add charge as a correction for the person (Phase 11); does nothing until then. */
  z.object({ kind: z.literal('add-correction'), month: monthKey, personId: z.string() }),
  /** Opens the Share bill sheet (7.10). */
  z.object({ kind: z.literal('share-bill'), month: monthKey }),
  /** Opens the template in Settings (9A). */
  z.object({ kind: z.literal('edit-template'), template: z.enum(['MONTHLY', 'NUDGE']) }),
]);

/** Where a Recipient button goes. Carries only what the target needs. */
export type RecipientTarget = z.infer<typeof recipientTargetSchema>;

/** A Recipient button: the footer's primary and secondary buttons, and the message card's Edit template. */
export const recipientActionSchema = z.object({
  /** e.g. `Send on WhatsApp`. */
  label: z.string(),
  /** Null for a button with a label only, like Share bill. */
  icon: z.enum(['send', 'check', 'plus']).nullable(),
  /** False while the button can't be used yet, e.g. Send on WhatsApp before the bill is saved. */
  enabled: z.boolean(),
  target: recipientTargetSchema,
});

/** A Recipient button: the footer's primary and secondary buttons, and the message card's Edit template. */
export type RecipientAction = z.infer<typeof recipientActionSchema>;

/** The amount card at the top. */
export const recipientAmountCardSchema = z.object({
  /** e.g. `Nov 2026 total`, `Nov 2026 so far` before the bill is saved, or `Received 27 Nov` when a payment differs. */
  label: z.string(),
  /** e.g. `$1,963.65`. */
  amount: z.string(),
  /** e.g. `Not sent`. */
  chip: badgeSchema,
  /**
   * e.g. `Due 7 Nov · includes Sam’s share`, `Overdue since 1 Nov`, `Paid in full 27 Nov` or
   * `$63.65 short of $1,963.65`. Null when there is nothing to say.
   */
  statusLine: z
    .object({
      text: z.string(),
      /** `danger` once the earliest due date has passed, `warning` for a short payment. */
      tone: z.enum(['default', 'warning', 'danger']),
    })
    .nullable(),
});

/** The amount card at the top. */
export type RecipientAmountCard = z.infer<typeof recipientAmountCardSchema>;

/** One unpaid charge in the overdue layout, ordered by due date. */
export const recipientChargeRowSchema = z.object({
  chargeId: z.string(),
  /** e.g. `Rent`, or `Utilities · Sam` for a charge paid through this person. */
  title: z.string(),
  /** e.g. `$950.00`. */
  amount: z.string(),
  /** e.g. `Due 1 Nov · nudged 2 Nov` or `Due 4 Nov · sent 2 Nov`. */
  detail: z.string(),
  /** Home's chip, e.g. `Overdue 2 days` or `Due tomorrow`. */
  chip: badgeSchema,
  /** For an overdue charge, the nudge about it (a row of the "Nudge about which charge?" sheet); null otherwise. */
  nudge: recipientNudgeTargetSchema.nullable(),
});

/** One charge row in the overdue layout. */
export type RecipientChargeRow = z.infer<typeof recipientChargeRowSchema>;

/** One line of a message section. */
export const recipientMessageLineSchema = z.object({
  /** e.g. `Utilities bill`, without the colon. */
  label: z.string(),
  /** e.g. `$123.69`; a credit reads `-$5.00`. */
  amount: z.string(),
  /** The working after the amount, e.g. `(total bill $412.30)` or `(1/6 units)`; null for other lines. */
  working: z.string().nullable(),
});

/** One person's lines in the message preview. */
export const recipientMessageSectionSchema = z.object({
  /** e.g. `Yours:`, `Sam’s (please collect):` or a custom title such as `Master Bedroom Share:`. Null for a lone own section. */
  title: z.string().nullable(),
  lines: z.array(recipientMessageLineSchema),
  /** e.g. `$1,862.86`. Null when the section is untitled. */
  subtotal: z.string().nullable(),
});

/** One person's lines in the message preview. */
export type RecipientMessageSection = z.infer<typeof recipientMessageSectionSchema>;

/** One line of the template's text after the sections. */
export const recipientMessageOutroLineSchema = z.object({
  /** e.g. `Total: $1,963.65`; an empty string is a blank line. */
  text: z.string(),
  /** True for the line holding the total (`{total}` in the template), which the preview stresses. */
  isTotal: z.boolean(),
});

/** One line of the template's text after the sections. */
export type RecipientMessageOutroLine = z.infer<typeof recipientMessageOutroLineSchema>;

/** The message card: a preview in parts, and the exact text that is sent and copied. */
export const recipientMessageSchema = z.object({
  /** e.g. `Message`, `Sent message` once the chat was opened, or `Nudge` / `Last nudge` in the overdue layout. */
  label: z.string(),
  /** e.g. `Monthly breakdown template`, `Nudge template`, or `Sent 2 Nov`. */
  meta: z.string(),
  /** The template's text before the sections, e.g. `Hi Priya! Eto na yung breakdown for Nov 2026 😊`; a nudge is all intro. */
  intro: z.string(),
  /** Empty when the message has no lines, e.g. a nudge. */
  sections: z.array(recipientMessageSectionSchema),
  /** The template's text after the sections, line by line, e.g. `Total: $1,963.65` then the due line. Empty without one. */
  outro: z.array(recipientMessageOutroLineSchema),
  /** The whole message as sent and copied (Copy as plain text), with `*bold*` section titles and line breaks. */
  text: z.string(),
  /** The Edit template link in the card's header. */
  editTemplate: recipientActionSchema,
});

/** The message card: a preview in parts, and the exact text that is sent and copied. */
export type RecipientMessage = z.infer<typeof recipientMessageSchema>;

/** `GET /api/months/:month/recipients/:personId`: one person's Recipient screen, ready to render. */
export const recipientResponseSchema = z.object({
  month: monthKey,
  personId: z.string(),
  header: z.object({
    /** e.g. `Priya`. */
    name: z.string(),
    /** e.g. `Master room · pays you directly`, or `Own room · utilities and aircon via Priya`. */
    sub: z.string(),
  }),
  amountCard: recipientAmountCardSchema,
  /** The overdue layout's rows, one per unpaid charge; empty in the other layouts. */
  charges: z.array(recipientChargeRowSchema),
  /** Null once every charge the person pays has a payment (`paid`, `paidDifferent`); `allPaid` shows instead. */
  message: recipientMessageSchema.nullable(),
  /** Stands in for the message once every charge has a payment. Null while a message shows. */
  allPaid: z
    .object({
      /** e.g. `All payments done`, or `No messages to send` when a payment differs. */
      title: z.string(),
      /** e.g. `Nothing left to send for November.` */
      note: z.string(),
    })
    .nullable(),
  /** A line of text under the message or in its place, e.g. why a payment is short. Null when there is none. */
  note: z.string().nullable(),
  /** The wide footer button, e.g. `Send on WhatsApp`. Null when there is none (`paid`). */
  primaryAction: recipientActionSchema.nullable(),
  /** The outline buttons beside or under it, e.g. `Share bill`. */
  secondaryActions: z.array(recipientActionSchema),
});

/** `GET /api/months/:month/recipients/:personId`: one person's Recipient screen, ready to render. */
export type RecipientResponse = z.infer<typeof recipientResponseSchema>;

/** `POST /api/months/:month/recipients/:personId/message-events`: records that a WhatsApp chat was opened. */
export const createMessageEventRequestSchema = z.discriminatedUnion('kind', [
  /** The monthly breakdown (Send on WhatsApp, Send again). */
  z.object({ kind: z.literal('MONTHLY') }),
  /** A nudge about one of the person's charges (7.8). */
  z.object({ kind: z.literal('NUDGE'), chargeId: z.string().min(1) }),
]);

/** `POST /api/months/:month/recipients/:personId/message-events`: records that a WhatsApp chat was opened. */
export type CreateMessageEventRequest = z.infer<typeof createMessageEventRequestSchema>;

/** The recorded message event. The server renders and stores the message text itself. */
export const messageEventResponseSchema = z.object({
  id: z.string(),
  kind: z.enum(['MONTHLY', 'NUDGE']),
  /** The nudged charge; null for a monthly message. */
  chargeId: z.string().nullable(),
  /** When the chat was opened, as an ISO timestamp. */
  openedAt: z.iso.datetime({ offset: true }),
});

/** The recorded message event. The server renders and stores the message text itself. */
export type MessageEventResponse = z.infer<typeof messageEventResponseSchema>;
