import { z } from 'zod';
import { monthKey } from '../schemas/primitives';
import { badgeSchema } from './history';

/**
 * Where a Recipient button goes. Carries only what the target needs. Later steps add the nudge
 * target.
 */
export const recipientTargetSchema = z.discriminatedUnion('kind', [
  /**
   * Opens the person's WhatsApp chat with the monthly message, then records a MONTHLY message event.
   * `url` is the `https://wa.me/...` link with the message filled in; null when the person has no
   * WhatsApp number, and the button is then disabled.
   */
  z.object({ kind: z.literal('send-whatsapp'), month: monthKey, personId: z.string(), url: z.url().nullable() }),
  /** Opens Record payment (7.3) with this person chosen. */
  z.object({ kind: z.literal('record-payment'), month: monthKey, personId: z.string() }),
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
  /** e.g. `Nov 2026 total`, or `Nov 2026 so far` before the bill is saved. */
  label: z.string(),
  /** e.g. `$1,963.65`. */
  amount: z.string(),
  /** e.g. `Not sent`. */
  chip: badgeSchema,
  /** e.g. `Due 7 Nov · includes Sam’s share`, or `Overdue since 1 Nov`. Null when there is nothing to say. */
  statusLine: z
    .object({
      text: z.string(),
      /** `danger` once the earliest due date has passed. */
      tone: z.enum(['default', 'warning', 'danger']),
    })
    .nullable(),
});

/** The amount card at the top. */
export type RecipientAmountCard = z.infer<typeof recipientAmountCardSchema>;

/** One charge row in the overdue layout (filled from 7.8; empty before). */
export const recipientChargeRowSchema = z.object({
  chargeId: z.string(),
  /** e.g. `Rent`. */
  title: z.string(),
  /** e.g. `$950.00`. */
  amount: z.string(),
  /** e.g. `Due 1 Nov`. */
  detail: z.string(),
  /** e.g. `Overdue 2 days`. */
  chip: badgeSchema,
});

/** One charge row in the overdue layout. */
export type RecipientChargeRow = z.infer<typeof recipientChargeRowSchema>;

/** One line of a message section. */
export const recipientMessageLineSchema = z.object({
  /** e.g. `Utilities bill (1.5 of 5 shares of $412.30)`. */
  label: z.string(),
  /** e.g. `$123.69`; a credit reads `-$5.00`. */
  amount: z.string(),
});

/** One person's lines in the message preview. */
export const recipientMessageSectionSchema = z.object({
  /** e.g. `Yours:` or `Sam’s (please collect):`, without WhatsApp's bold markers. Null for a lone own section. */
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
  /** e.g. `Message`, or `Sent message` once the chat was opened. */
  label: z.string(),
  /** e.g. `Monthly breakdown template`, or `Sent 2 Nov`. */
  meta: z.string(),
  /** The template's text before the sections, e.g. `Hi Priya! Eto na yung breakdown for Nov 2026 😊`. */
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
  /** The overdue layout's charge rows; empty in the other layouts. */
  charges: z.array(recipientChargeRowSchema),
  message: recipientMessageSchema,
  /** A line of text under the message, e.g. why a payment is short. Null when there is none. */
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
