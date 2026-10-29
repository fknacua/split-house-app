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
  /**
   * The bill's own Subtotal: the charges before GST, which the lines should add up to. Shown read-only
   * under the lines and used by the check; not editable and not saved.
   */
  subtotalCents: cents.nullable(),
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
 * `POST /api/months/:month/bill-draft/check`: the form's values as they are right now, before they
 * are all valid. A field the user has not filled in, or typed text that is not a month, is null.
 */
export const checkBillRequestSchema = billDraftFieldsSchema;

/** `POST /api/months/:month/bill-draft/check`: the form's values as they are right now. */
export type CheckBillRequest = z.infer<typeof checkBillRequestSchema>;

/** Something that stops Save: the field to mark red and the Alert text above the form. */
export const billBlockerSchema = z.object({
  /** The form field the problem is on. */
  field: z.enum(['billMonth', 'billingPeriod']),
  /** Alert title, e.g. `Did you attach the wrong bill?`. */
  title: z.string(),
  /** Alert text, display-ready. */
  message: z.string(),
  /** The short error under the red field, e.g. `Should be November 2026`. */
  fieldMessage: z.string(),
});

/** Something that stops Save: the field to mark red and the Alert text above the form. */
export type BillBlocker = z.infer<typeof billBlockerSchema>;

/** The warning under the lines: some have no amount, or they do not add up to the Subtotal. It never stops Save. */
export const billLinesNoteSchema = z.object({
  /** Bold first line, e.g. `2 lines not found` or `Lines don’t add up to the Subtotal`. */
  title: z.string(),
  /** Second line, display-ready, e.g. `Lines total $335.50, which is $14.50 less than the Subtotal. …`. */
  message: z.string(),
});

/** The warning under the lines: some have no amount, or they do not add up to the Subtotal. It never stops Save. */
export type BillLinesNote = z.infer<typeof billLinesNoteSchema>;

/** `POST /api/months/:month/bill-draft/check`: what the server finds wrong with the values. */
export const checkBillResponseSchema = z.object({
  /** Problems that disable Save. Save checks them again and answers 422. */
  blockers: z.array(billBlockerSchema),
  /** The warning under the lines, or null when they match the Subtotal or there is nothing to say (no lines, or all have amounts and there is no Subtotal). */
  linesNote: billLinesNoteSchema.nullable(),
});

/** `POST /api/months/:month/bill-draft/check`: what the server finds wrong with the values. */
export type CheckBillResponse = z.infer<typeof checkBillResponseSchema>;

/**
 * `POST /api/months/:month/bill`: the reviewed values. The file is the month's stored draft, so it
 * is not sent again. Current Charges, the bill month, the due date and the billing period are
 * required: the bill is the source of truth for the month it covers.
 */
export const saveBillRequestSchema = billDraftFieldsSchema.omit({ subtotalCents: true }).extend({
  currentChargesCents: positiveCents,
  billMonth: monthKey,
  dueDate: dateKey,
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
