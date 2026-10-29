import * as DocumentPicker from 'expo-document-picker';
import { z } from 'zod';

import { EMPTY_DATE_RANGE } from '@/components';
import type { PickedPdf } from '@/hooks';
import {
  cents,
  formatMonthShortLabel,
  MAX_BILL_PDF_BYTES,
  parseShortDisplayMonth,
  positiveCents,
  requiredText,
  type BillDraftFields,
  type SaveBillRequest,
} from '@splithouse/shared';

/** Why a picked file cannot be uploaded, found on the phone before sending it. */
export type PickedPdfProblem = 'not_pdf' | 'too_large';

/** A picked file, or the reason it was turned away. */
export type PickResult = { file: PickedPdf; problem: null } | { file: null; problem: PickedPdfProblem };

/**
 * Opens Android's file picker for one PDF and checks it before upload: the type the picker
 * reports and the size. The server checks the bytes again.
 *
 * @returns The picked file or the problem with it, or `null` when the picker was cancelled.
 */
export async function pickBillPdf(): Promise<PickResult | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  if (result.canceled) return null;
  const [asset] = result.assets;
  if (!asset) return null;
  if (asset.mimeType && asset.mimeType !== 'application/pdf') return { file: null, problem: 'not_pdf' };
  if (asset.size !== undefined && asset.size > MAX_BILL_PDF_BYTES) return { file: null, problem: 'too_large' };
  return { file: { uri: asset.uri, name: asset.name }, problem: null };
}

/**
 * The Review bill form's checks. The device checks required fields only (Current Charges and a
 * name on each line); every other check is the server's.
 */
export const reviewFormSchema = z.object({
  // `null` while the field is empty (or the PDF had no Current Charges); that is an error, not a pass.
  // The `boolean` return keeps TypeScript from narrowing the form's value type to `number`.
  currentChargesCents: positiveCents
    .nullable()
    .refine((value): boolean => value !== null, 'Enter Current Charges'),
  // Free text such as `Oct 2026`; empty is allowed, anything else must read as a month.
  billMonth: z.string().refine((text) => text.trim() === '' || parseShortDisplayMonth(text) !== null, {
    message: 'Use a month like Oct 2026',
  }),
  dueDate: z.string(),
  billingPeriod: z.object({ start: z.string(), end: z.string() }),
  lines: z.array(z.object({ label: requiredText, cents: cents.nullable() })),
});

/**
 * The Review bill form's values. Empty dates and months are `''`, as the fields hold them; the
 * bill month is the text the user types (`Oct 2026`), not a month key.
 */
export type ReviewFormValues = z.infer<typeof reviewFormSchema>;

/**
 * Fills the Review bill form from what the server read.
 *
 * @param fields The draft's fields.
 * @returns The form's starting values.
 */
export function toReviewFormValues(fields: BillDraftFields): ReviewFormValues {
  return {
    currentChargesCents: fields.currentChargesCents,
    billMonth: fields.billMonth ? formatMonthShortLabel(fields.billMonth) : '',
    dueDate: fields.dueDate ?? '',
    billingPeriod:
      fields.billingPeriodStart && fields.billingPeriodEnd
        ? { start: fields.billingPeriodStart, end: fields.billingPeriodEnd }
        : EMPTY_DATE_RANGE,
    lines: fields.lines,
  };
}

/**
 * Turns the checked form values into the save request.
 *
 * @param values The form values, after `reviewFormSchema` passed.
 * @returns The `POST /api/months/:month/bill` body.
 */
export function toSaveBillRequest(values: ReviewFormValues): SaveBillRequest {
  const { start, end } = values.billingPeriod;
  return {
    // The footer only offers Save once Current Charges is filled in.
    currentChargesCents: values.currentChargesCents ?? 0,
    billMonth: parseShortDisplayMonth(values.billMonth),
    dueDate: values.dueDate || null,
    billingPeriodStart: start || null,
    billingPeriodEnd: end || null,
    lines: values.lines.map((line) => ({ label: line.label.trim(), cents: line.cents })),
  };
}
