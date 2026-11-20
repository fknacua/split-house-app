import { z } from 'zod';

/** One line of a message section. */
export const messageLineSchema = z.object({
  /** e.g. `Utilities bill`, without the colon. */
  label: z.string(),
  /** e.g. `$X,XXX.XX`; a credit reads `-$X,XXX.XX`. */
  amount: z.string(),
  /** The working after the amount, e.g. `(total bill $X,XXX.XX)` or `(1/6 units)`; null for other lines. */
  working: z.string().nullable(),
});

/** One line of a message section. */
export type MessageLine = z.infer<typeof messageLineSchema>;

/** One person's lines in the message preview. */
export const messageSectionSchema = z.object({
  /** e.g. `Yours:`, `Sam’s (please collect):` or a custom title such as `Master Bedroom Share:`. Null for a lone own section. */
  title: z.string().nullable(),
  lines: z.array(messageLineSchema),
  /** e.g. `$X,XXX.XX`. Null when the section is untitled. */
  subtotal: z.string().nullable(),
});

/** One person's lines in the message preview. */
export type MessageSection = z.infer<typeof messageSectionSchema>;

/**
 * A piece of template text, bold or not, as WhatsApp shows it: the server reads the `*bold*` markers and leaves them
 * out. Its text may hold line breaks; a bold piece never does.
 */
export const messageRunSchema = z.object({
  text: z.string(),
  bold: z.boolean(),
});

/** A piece of template text, bold or not, as WhatsApp shows it. */
export type MessageRun = z.infer<typeof messageRunSchema>;

/** A rendered message: a preview in parts, and the exact text that is sent and copied. The Send message sheet and the template editor both show it. */
export const messagePreviewSchema = z.object({
  /** The template's text before the sections, e.g. `Hi Priya! Eto na yung breakdown for Nov 2026 😊`. */
  intro: z.array(messageRunSchema),
  /** Empty when the message has no lines. */
  sections: z.array(messageSectionSchema),
  /** The template's text after the sections, e.g. **Total:** `$X,XXX.XX` then the due line. Empty without one. */
  outro: z.array(messageRunSchema),
  /** The whole message as sent and copied (Copy as plain text), with its `*bold*` markers and line breaks. */
  text: z.string(),
});

/** A rendered message: a preview in parts, and the exact text that is sent and copied. */
export type MessagePreview = z.infer<typeof messagePreviewSchema>;
