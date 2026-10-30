import { z } from 'zod';
import { dateKey, monthKey, positiveCents } from '../schemas/primitives';
import { badgeSchema } from './history';
import { homeTargetSchema } from './home';

/** One utility line on the bill card, e.g. `Electricity` and `$268.45`. */
export const billViewLineSchema = z.object({
  label: z.string(),
  /** e.g. `$268.45`, or `—` for a line saved with no amount. */
  amount: z.string(),
});

/** One utility line on the bill card, e.g. `Electricity` and `$268.45`. */
export type BillViewLine = z.infer<typeof billViewLineSchema>;

/** The top card: Current Charges, the due or paid badge and the bill's lines. */
export const billViewHeroSchema = z.object({
  /** Current Charges, e.g. `$412.30`. */
  amount: z.string(),
  /** e.g. `Due in 12 days`, `Overdue 2 days` or `Paid 16 Nov`. */
  badge: badgeSchema,
  /** In the order they were saved. Empty when the bill was saved with none. */
  lines: z.array(billViewLineSchema),
});

/** The top card: Current Charges, the due or paid badge and the bill's lines. */
export type BillViewHero = z.infer<typeof billViewHeroSchema>;

/** One person's share of the bill on the collection card. */
export const billViewPersonSchema = z.object({
  /** The person's id. Only a React key. */
  id: z.string(),
  /** `You` for the user, otherwise the person's name. */
  name: z.string(),
  /** e.g. `1.5 shares` or `1 share`. */
  shares: z.string(),
  /** e.g. `$123.69`. */
  amount: z.string(),
  /** e.g. `Covered`, `Paid 5 Nov`, `Not sent`, `Overdue 2 days` or `Waiting`. */
  badge: badgeSchema,
});

/** One person's share of the bill on the collection card. */
export type BillViewPerson = z.infer<typeof billViewPersonSchema>;

/** The collection card: how much of the bill is covered, and a row per person. */
export const billViewCollectionSchema = z.object({
  /** `Collected so far`, or `Fully collected` once all of it is covered. */
  title: z.string(),
  /** e.g. `$123.69 of $412.30`. */
  note: z.string(),
  /** 0 to 100, for the progress bar. */
  percent: z.number().min(0).max(100),
  /** The user first, then everyone else in household order. */
  people: z.array(billViewPersonSchema),
});

/** The collection card: how much of the bill is covered, and a row per person. */
export type BillViewCollection = z.infer<typeof billViewCollectionSchema>;

/** One label and value row on the facts card, e.g. `Due date` and `16 Nov 2026`. */
export const billViewFactSchema = z.object({
  label: z.string(),
  value: z.string(),
});

/** One label and value row on the facts card, e.g. `Due date` and `16 Nov 2026`. */
export type BillViewFact = z.infer<typeof billViewFactSchema>;

/** The stored PDF's row. */
export const billViewFileSchema = z.object({
  filename: z.string(),
  /** e.g. `2 pages · added 2 Nov`, or `added 2 Nov` when the page count is not known. */
  meta: z.string(),
});

/** The stored PDF's row. */
export type BillViewFile = z.infer<typeof billViewFileSchema>;

/** The footer button, e.g. `Mark bill paid`. */
export const billViewActionSchema = z.object({
  label: z.string(),
  target: homeTargetSchema,
});

/** The footer button, e.g. `Mark bill paid`. */
export type BillViewAction = z.infer<typeof billViewActionSchema>;

/** The Mark bill paid sheet's text, so the sheet needs no request of its own. */
export const billPaySheetSchema = z.object({
  /** e.g. `Utilities bill · November`. */
  subtitle: z.string(),
  /** Current Charges, e.g. `$412.30`. */
  currentCharges: z.string(),
  /** The due date with no year, e.g. `16 Nov`. Null when none is known. */
  due: z.string().nullable(),
  /** Amount paid, filled in: Current Charges in cents. */
  amountCents: positiveCents,
  /** What has been collected so far, not about the amount typed. */
  note: z.object({
    /** `success` once all of it is collected, otherwise `warning`. Same names as the app's `Alert` variants. */
    tone: z.enum(['success', 'warning']),
    /** e.g. `You’ve collected $123.69 so far. You’re covering $288.61 until the others pay.` */
    text: z.string(),
  }),
  /** The save button, e.g. `Mark as paid`. */
  actionLabel: z.string(),
});

/** The Mark bill paid sheet's text, so the sheet needs no request of its own. */
export type BillPaySheet = z.infer<typeof billPaySheetSchema>;

/** One line of the Share bill summary's preview: `title` bold, `body` plain, `muted` in the variant colour. */
export const billShareLineSchema = z.object({
  text: z.string(),
  tone: z.enum(['title', 'body', 'muted']),
});

/** One line of the Share bill summary's preview: `title` bold, `body` plain, `muted` in the variant colour. */
export type BillShareLine = z.infer<typeof billShareLineSchema>;

/** One version of the Share bill summary: its preview lines and the plain text that is shared. */
export const billShareSummarySchema = z.object({
  /** e.g. `Utilities bill · Nov 2026`, `Current Charges: $412.30`, `Due: 16 Nov 2026`, then `Charges:` and a bulleted line per bill line. */
  lines: z.array(billShareLineSchema),
  /** The lines' text joined with line breaks, with no WhatsApp markers. */
  text: z.string(),
});

/** One version of the Share bill summary: its preview lines and the plain text that is shared. */
export type BillShareSummary = z.infer<typeof billShareSummarySchema>;

/** The Share bill sheet's text, so the sheet needs no request of its own. */
export const billShareSchema = z.object({
  /** e.g. `Utilities bill · November 2026`. */
  title: z.string(),
  /** The stored PDF, shared under its own name. Null when the bill has no stored file. */
  file: z
    .object({
      filename: z.string(),
      /** e.g. `2 pages · 214 KB`, or `214 KB` when the page count is not known, as on Bill upload. */
      meta: z.string(),
    })
    .nullable(),
  /** The summary with the bill totals only. */
  summary: billShareSummarySchema,
  /** The summary followed by `Shares:` and a bulleted line per person, e.g. `• Alex $123.69`. */
  summaryWithShares: billShareSummarySchema,
});

/** The Share bill sheet's text, so the sheet needs no request of its own. */
export type BillShare = z.infer<typeof billShareSchema>;

/** `POST /api/months/:month/bill/paid`: what the user paid the utility company, and when. */
export const markBillPaidRequestSchema = z.object({
  /** May differ from Current Charges. */
  paidCents: positiveCents,
  /** Today or earlier. */
  paidOn: dateKey,
});

/** `POST /api/months/:month/bill/paid`: what the user paid the utility company, and when. */
export type MarkBillPaidRequest = z.infer<typeof markBillPaidRequestSchema>;

/** `POST /api/months/:month/bill/paid`: the month whose bill was marked paid. */
export const markBillPaidResponseSchema = z.object({ month: monthKey });

/** `POST /api/months/:month/bill/paid`: the month whose bill was marked paid. */
export type MarkBillPaidResponse = z.infer<typeof markBillPaidResponseSchema>;

/** `GET /api/months/:month/bill`: the month's saved utilities bill, ready to render. */
export const billViewResponseSchema = z.object({
  /** `YYYY-MM`. */
  month: monthKey,
  /** The header's subtitle, e.g. `November 2026`. */
  monthName: z.string(),
  hero: billViewHeroSchema,
  collection: billViewCollectionSchema,
  /** Bill month, Billing period and Due date when known, then `You paid` once the bill is paid. */
  facts: z.array(billViewFactSchema),
  /** Null when the bill has no stored file. */
  file: billViewFileSchema.nullable(),
  /** `Mark bill paid` while the current month is collecting and the bill is unpaid; otherwise null. */
  action: billViewActionSchema.nullable(),
  /** The Mark bill paid sheet's text while the bill is unpaid; null once it is paid. */
  paySheet: billPaySheetSchema.nullable(),
  /** The Share bill sheet's text, opened from Recipient. */
  share: billShareSchema,
});

/** `GET /api/months/:month/bill`: the month's saved utilities bill, ready to render. */
export type BillViewResponse = z.infer<typeof billViewResponseSchema>;
