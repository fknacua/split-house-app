import { z } from 'zod';
import { monthKey } from '../schemas/primitives';

/** The look of a badge. Same names as the app's `Badge` variants, so the app passes it straight through. */
export const badgeToneSchema = z.enum(['neutral', 'primary', 'success', 'warning', 'danger', 'info']);

/** The look of a badge. Same names as the app's `Badge` variants, so the app passes it straight through. */
export type BadgeTone = z.infer<typeof badgeToneSchema>;

/** A badge ready to render: its text and look. */
export const badgeSchema = z.object({
  label: z.string(),
  tone: badgeToneSchema,
});

/** A badge ready to render: its text and look. */
export type BadgeContent = z.infer<typeof badgeSchema>;

/** One past month in the History list, with the text already written. */
export const historyMonthSchema = z.object({
  /** `YYYY-MM`. The only machine value: the app opens the month detail with it. */
  month: monthKey,
  /** e.g. `November 2026`. */
  name: z.string(),
  /** Small lines under the name. Always at least one; the screen shows the first. */
  details: z.array(z.string()).min(1),
  chips: z.array(badgeSchema),
});

/** One past month in the History list, with the text already written. */
export type HistoryMonth = z.infer<typeof historyMonthSchema>;

/** The months of one year, newest first. */
export const historyGroupSchema = z.object({
  /** e.g. `2026`. */
  year: z.string(),
  months: z.array(historyMonthSchema),
});

/** The months of one year, newest first. */
export type HistoryGroup = z.infer<typeof historyGroupSchema>;

/** `GET /api/history`: past months grouped by year, newest first. Empty when there is no history yet. */
export const historyListResponseSchema = z.object({
  groups: z.array(historyGroupSchema),
});

/** `GET /api/history`: past months grouped by year, newest first. Empty when there is no history yet. */
export type HistoryListResponse = z.infer<typeof historyListResponseSchema>;

/** One payment row on the month detail: a charge and whether it was paid. */
export const historyPaymentSchema = z.object({
  /** e.g. `Rent - Tenant 1`. */
  title: z.string(),
  /** e.g. `$950.00`. */
  amount: z.string(),
  /** Small lines under the title, e.g. `Sep Utils - Added 2 Oct` on a correction. Often empty. */
  details: z.array(z.string()),
  /** e.g. `Paid 3 Nov`. */
  badge: badgeSchema,
});

/** One payment row on the month detail: a charge and whether it was paid. */
export type HistoryPayment = z.infer<typeof historyPaymentSchema>;

/** The month's utilities bill card. */
export const historyBillSchema = z.object({
  /** The bill's Current Charges, e.g. `$412.30`. */
  amount: z.string(),
  /** e.g. `Paid 16 Nov`. Null while the bill is not marked paid. */
  badge: badgeSchema.nullable(),
});

/** The month's utilities bill card. */
export type HistoryBill = z.infer<typeof historyBillSchema>;

/** A notice at the top of the month detail, e.g. that the month was corrected later. */
export const historyBannerSchema = z.object({
  /** Same names as the app's `Alert` variants. */
  tone: z.enum(['info', 'warning', 'danger', 'success']),
  /** e.g. `Corrected in Oct`. */
  title: z.string(),
  /** e.g. `A $15.00 charge for Jordan was added in Oct.` */
  text: z.string(),
});

/** A notice at the top of the month detail, e.g. that the month was corrected later. */
export type HistoryBanner = z.infer<typeof historyBannerSchema>;

/** `GET /api/history/:month`: one past month, read-only. */
export const historyMonthResponseSchema = z.object({
  /** `YYYY-MM`. */
  month: monthKey,
  /** e.g. `November 2026`. */
  name: z.string(),
  /** One per correction made to this month later. Empty when there are none. */
  banners: z.array(historyBannerSchema),
  bill: historyBillSchema,
  /** Unpaid first, then paid, most recent payment first; then a row per correction made to this month. */
  payments: z.array(historyPaymentSchema),
});

/** `GET /api/history/:month`: one past month, read-only. */
export type HistoryMonthResponse = z.infer<typeof historyMonthResponseSchema>;
