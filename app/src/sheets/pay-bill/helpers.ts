import { positiveCents, todayKey, type BillPaySheet, type MarkBillPaidRequest } from '@splithouse/shared';
import { z } from 'zod';

/** The Mark bill paid form: the amount and the day. The day picker stops at today. */
export const payBillFormSchema = z.object({
  // `null` while the field is empty; that is an error, not a pass.
  // The `boolean` return keeps TypeScript from narrowing the form's value type to `number`.
  paidCents: positiveCents.nullable().refine((value): boolean => value !== null, 'Enter the amount you paid'),
  paidOn: z.string().refine((text) => text !== '', { message: 'Enter the day you paid' }),
});

/** The Mark bill paid form's values. */
export type PayBillFormValues = z.infer<typeof payBillFormSchema>;

/**
 * The form as the sheet opens: Current Charges as the amount, and today.
 *
 * @param sheet The sheet's text from the bill response.
 * @returns The form's starting values.
 */
export function toPayBillFormValues(sheet: BillPaySheet): PayBillFormValues {
  return { paidCents: sheet.amountCents, paidOn: todayKey() };
}

/**
 * The save request from a valid form.
 *
 * @param values The form's values, already checked by {@link payBillFormSchema}.
 * @returns The request body.
 */
export function toMarkBillPaidRequest(values: PayBillFormValues): MarkBillPaidRequest {
  return { paidCents: values.paidCents ?? 0, paidOn: values.paidOn };
}
