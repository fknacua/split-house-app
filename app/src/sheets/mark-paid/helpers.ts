import {
  formatCents,
  formatPaymentDifference,
  positiveCents,
  type ChargePaymentResponse,
  type PaymentOptionPerson,
  type PaymentOptionsResponse,
  type RecipientPaidCharge,
  type SavePaymentRequest,
} from '@splithouse/shared';
import { z } from 'zod';

import type { SelectOption } from '@/components';
import type { AmountState, PaymentChoice, PaymentPick, PaymentVerb } from './types';

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
 * What the amount field says and what the button reads for the amount typed so far. While it
 * differs from the expected amount the helper is hidden, the button names the amount and an Alert
 * words the shortfall or overpayment; an empty or exact amount reads as the sheet opened.
 *
 * @param sheet The sheet from `GET /api/charges/:id/payment`.
 * @param paidCents The amount typed, or `null` while the field is empty or not yet valid.
 * @param verb The button's word while the amount differs: `Save` on Mark paid, `Record` on Record payment.
 * @returns The helper text (or `null`), the button label and the difference (or `null` for no Alert).
 */
export function toAmountState(
  sheet: ChargePaymentResponse,
  paidCents: number | null,
  verb: PaymentVerb = 'Save',
): AmountState {
  const opened: AmountState = {
    helper: 'Change it if they paid a different amount',
    actionLabel: sheet.actionLabel,
    difference: null,
  };
  // An empty or zero amount is the form's error to show, not a difference.
  if (paidCents === null || paidCents <= 0) return opened;
  const difference = formatPaymentDifference(sheet.expectedCents, paidCents, sheet.month);
  if (difference === null) return opened;
  return { helper: null, actionLabel: `${verb} ${formatCents(paidCents)}`, difference };
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

/**
 * The person and charge Record payment shows. A chosen charge wins (opened from a charge, or
 * picked in For), then a chosen person with their first charge; with neither, the most urgent
 * person (the server lists them first) and their first charge.
 *
 * @param options The lists from `GET /api/months/:month/payment-options`, or undefined while they load.
 * @param pick What was chosen so far.
 * @returns The person and charge, or `null` while loading or when nobody has anything to pay.
 */
export function choosePayment(options: PaymentOptionsResponse | undefined, pick: PaymentPick): PaymentChoice | null {
  if (!options) return null;
  const byCharge = pick.chargeId
    ? options.people.find((p) => p.charges.some((c) => c.sheet.chargeId === pick.chargeId))
    : undefined;
  const byPerson = options.people.find((p) => p.personId === pick.personId);
  const person = byCharge ?? byPerson ?? options.people[0];
  if (!person) return null;
  const charge = person.charges.find((c) => c.sheet.chargeId === pick.chargeId) ?? person.charges[0];
  return { person, charge };
}

/**
 * The From list: each person's name, with their detail line under it.
 *
 * @param options The lists, or undefined while they load (an empty list).
 * @returns One option per person, valued by their id.
 */
export function toFromOptions(options: PaymentOptionsResponse | undefined): SelectOption[] {
  return (options?.people ?? []).map((p) => ({ label: p.name, value: p.personId, detail: p.detail }));
}

/**
 * Edit payment's For list: each paid charge with what was received on the right and its paid line
 * under it.
 *
 * @param charges The person's paid charges, from Recipient's Edit payment target.
 * @returns One option per charge, valued by its id.
 */
export function toPaidChargeOptions(charges: RecipientPaidCharge[]): SelectOption[] {
  return charges.map((c) => ({ label: c.title, value: c.chargeId, trailing: c.received, detail: c.detail }));
}

/**
 * The For list: the person's charges, each with its expected amount on the right and its due line
 * under it, in red while overdue.
 *
 * @param person The chosen person, or null while loading (an empty list).
 * @returns One option per charge, valued by its id.
 */
export function toForOptions(person: PaymentOptionPerson | null): SelectOption[] {
  return (person?.charges ?? []).map(({ label, sheet }) => ({
    label,
    value: sheet.chargeId,
    trailing: sheet.expected,
    detail: sheet.due?.text,
    detailTone: sheet.due?.tone,
  }));
}
