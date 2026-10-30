import { positiveCents, type ChargePaymentResponse, type SavePaymentRequest } from '@splithouse/shared';
import { z } from 'zod';

/** The Mark paid form: the amount received and the day. The day picker stops at today. */
export const markPaidFormSchema = z.object({
  // `null` while the field is empty; that is an error, not a pass.
  // The `boolean` return keeps TypeScript from narrowing the form's value type to `number`.
  paidCents: positiveCents.nullable().refine((value): boolean => value !== null, 'Enter the amount received'),
  paidOn: z.string().refine((text) => text !== '', { message: 'Enter the day it was received' }),
});

/** The Mark paid form's values. */
export type MarkPaidFormValues = z.infer<typeof markPaidFormSchema>;

/**
 * The form as the sheet opens, as the server filled it in: the expected amount and today, or the
 * stored payment for a charge already paid.
 *
 * @param sheet The sheet from `GET /api/charges/:id/payment`.
 * @returns The form's starting values.
 */
export function toMarkPaidFormValues(sheet: ChargePaymentResponse): MarkPaidFormValues {
  return { paidCents: sheet.amountCents, paidOn: sheet.paidOn };
}

/**
 * The save request from a valid form.
 *
 * @param values The form's values, already checked by {@link markPaidFormSchema}.
 * @returns The request body.
 */
export function toSavePaymentRequest(values: MarkPaidFormValues): SavePaymentRequest {
  return { paidCents: values.paidCents ?? 0, paidOn: values.paidOn };
}
