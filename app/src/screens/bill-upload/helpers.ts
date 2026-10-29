import * as DocumentPicker from 'expo-document-picker';
import { z } from 'zod';

import { EMPTY_DATE_RANGE } from '@/components';
import type { PickedPdf } from '@/hooks';
import {
  addMonths,
  cents,
  MAX_BILL_PDF_BYTES,
  monthRange,
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
  currentChargesCents: positiveCents.nullable(),
  billMonth: z.string(),
  dueDate: z.string(),
  billingPeriod: z.object({ start: z.string(), end: z.string() }),
  lines: z.array(z.object({ label: requiredText, cents: cents.nullable() })),
});

/** The Review bill form's values. Empty dates and months are `''`, as the fields hold them. */
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
    billMonth: fields.billMonth ?? '',
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
    billMonth: values.billMonth || null,
    dueDate: values.dueDate || null,
    billingPeriodStart: start || null,
    billingPeriodEnd: end || null,
    lines: values.lines.map((line) => ({ label: line.label.trim(), cents: line.cents })),
  };
}

/**
 * The months the Bill month list offers: the month after the upload's, back a year, plus the
 * month read from the bill when it falls outside that.
 *
 * @param month `YYYY-MM`, the month the upload started from.
 * @param read The bill month read from the PDF, or `''`.
 * @returns Month keys, newest first.
 */
export function billMonthOptions(month: string, read: string): string[] {
  const months = monthRange(addMonths(month, 1), 13, 'back');
  if (read && !months.includes(read)) months.push(read);
  return months.sort().reverse();
}
