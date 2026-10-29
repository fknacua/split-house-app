import { z } from 'zod';
import { cents, dateKey, monthKey, positiveCents, requiredText } from '../schemas/primitives';

/** One utility line on a bill, e.g. `{ label: "Electricity", cents: 21000 }`. `cents` is null while a line has no amount. */
export const billLineSchema = z.object({
  label: z.string(),
  cents: cents.nullable(),
});

/** One utility line on a bill, e.g. `{ label: "Electricity", cents: 21000 }`. `cents` is null while a line has no amount. */
export type BillLine = z.infer<typeof billLineSchema>;

/** The values on the Review bill form, as read from the PDF. Every field is null when the bill did not have it. */
export const billDraftFieldsSchema = z.object({
  currentChargesCents: cents.nullable(),
  /** `YYYY-MM`, the month the bill says it is for. */
  billMonth: monthKey.nullable(),
  dueDate: dateKey.nullable(),
  billingPeriodStart: dateKey.nullable(),
  billingPeriodEnd: dateKey.nullable(),
  lines: z.array(billLineSchema),
});

/** The values on the Review bill form, as read from the PDF. Every field is null when the bill did not have it. */
export type BillDraftFields = z.infer<typeof billDraftFieldsSchema>;

/**
 * `POST /api/months/:month/bill-draft` and `GET /api/months/:month/bill-draft`: the uploaded file,
 * not saved yet, and what was read from it.
 */
export const billDraftResponseSchema = z.object({
  /** `YYYY-MM`, the month the upload started from. */
  month: monthKey,
  file: z.object({
    filename: z.string(),
    /** e.g. `2 pages · 214 KB`. */
    meta: z.string(),
  }),
  /** False when no Current Charges could be read; `fields` is then empty. */
  readOk: z.boolean(),
  fields: billDraftFieldsSchema,
});

/** `POST` and `GET /api/months/:month/bill-draft`: the uploaded file, not saved yet, and what was read from it. */
export type BillDraftResponse = z.infer<typeof billDraftResponseSchema>;

/**
 * `POST /api/months/:month/bill`: the reviewed values. The file is the month's stored draft, so it
 * is not sent again. Current Charges, the bill month and the billing period are required: the bill
 * is the source of truth for the month it covers.
 */
export const saveBillRequestSchema = billDraftFieldsSchema.extend({
  currentChargesCents: positiveCents,
  billMonth: monthKey,
  billingPeriodStart: dateKey,
  billingPeriodEnd: dateKey,
  lines: z.array(billLineSchema.extend({ label: requiredText })),
});

/** `POST /api/months/:month/bill`: the reviewed values. The file is the month's stored draft, so it is not sent again. */
export type SaveBillRequest = z.infer<typeof saveBillRequestSchema>;

/** `POST /api/months/:month/bill`: the month whose bill was saved. */
export const saveBillResponseSchema = z.object({
  month: monthKey,
});

/** `POST /api/months/:month/bill`: the month whose bill was saved. */
export type SaveBillResponse = z.infer<typeof saveBillResponseSchema>;
