import { z } from 'zod';
import { dateKey, monthKey, positiveCents } from '../schemas/primitives';

/** The Due row on the payment sheet. */
export const paymentSheetDueSchema = z.object({
  /** e.g. `7 Nov`, or `Overdue since 1 Nov` for an unpaid charge past its due date. */
  text: z.string(),
  /** `danger` while the charge is overdue, otherwise `default`. */
  tone: z.enum(['default', 'danger']),
});

/** The Due row on the payment sheet. */
export type PaymentSheetDue = z.infer<typeof paymentSheetDueSchema>;

/** `GET /api/charges/:id/payment`: the Mark paid sheet for one charge, ready to render. */
export const chargePaymentResponseSchema = z.object({
  chargeId: z.string(),
  /** The charge's month, for wording a different amount with `formatPaymentDifference`. */
  month: monthKey,
  /** e.g. `Mark paid`. */
  title: z.string(),
  /** Home's row title and the charge's month, e.g. `Rent · Jordan · November`. */
  subtitle: z.string(),
  /** What the charge asks for, e.g. `$1,963.65`. */
  expected: z.string(),
  /** `expected` in cents, so the sheet can tell when the amount received differs. */
  expectedCents: positiveCents,
  /** Null when the charge has no due date. */
  due: paymentSheetDueSchema.nullable(),
  /** Amount received, filled in: the expected amount, or the stored amount once the charge is paid. */
  amountCents: positiveCents,
  /** Received on, filled in: today, or the stored day once the charge is paid. */
  paidOn: dateKey,
  /** The save button, e.g. `Mark as paid`. */
  actionLabel: z.string(),
});

/** `GET /api/charges/:id/payment`: the Mark paid sheet for one charge, ready to render. */
export type ChargePaymentResponse = z.infer<typeof chargePaymentResponseSchema>;

/** `POST /api/charges/:id/payment`: what was received for the charge, and when. Replaces a stored payment. */
export const savePaymentRequestSchema = z.object({
  /** May differ from the expected amount. Stored as received, with no carry. */
  paidCents: positiveCents,
  /** Today or earlier. */
  paidOn: dateKey,
});

/** `POST /api/charges/:id/payment`: what was received for the charge, and when. Replaces a stored payment. */
export type SavePaymentRequest = z.infer<typeof savePaymentRequestSchema>;

/** `POST /api/charges/:id/payment`: the charge that was paid and its month, so the app can refetch that month. */
export const savePaymentResponseSchema = z.object({
  chargeId: z.string(),
  month: monthKey,
});

/** `POST /api/charges/:id/payment`: the charge that was paid and its month, so the app can refetch that month. */
export type SavePaymentResponse = z.infer<typeof savePaymentResponseSchema>;

/** One charge in Record payment's For list. */
export const paymentOptionChargeSchema = z.object({
  /** e.g. `Rent · Nov`, or `Utilities · Sam · Nov` for a charge paid through the From person. */
  label: z.string(),
  /**
   * The sheet for this charge in Record payment's words: title `Record payment`, subtitle `Money
   * you received for November` (the charge's own month), button `Record $950.00`. Choosing the
   * charge swaps the sheet's text to this.
   */
  sheet: chargePaymentResponseSchema,
});

/** One charge in Record payment's For list. */
export type PaymentOptionCharge = z.infer<typeof paymentOptionChargeSchema>;

/** One person in Record payment's From list, with what they still have to pay. */
export const paymentOptionPersonSchema = z.object({
  personId: z.string(),
  name: z.string(),
  /** e.g. `2 unpaid · $1,050.79`, or `1 upcoming · $950.00` when none is overdue or due within 7 days. */
  detail: z.string(),
  /**
   * Their unpaid charges and the unpaid charges paid through them: the newest opened month's
   * first, then earlier months', each by due date. Never empty.
   */
  charges: z.array(paymentOptionChargeSchema).min(1),
});

/** One person in Record payment's From list, with what they still have to pay. */
export type PaymentOptionPerson = z.infer<typeof paymentOptionPersonSchema>;

/** `GET /api/months/:month/payment-options`: Record payment's From and For lists. */
export const paymentOptionsResponseSchema = z.object({
  month: monthKey,
  /** Most urgent first (the earliest due date among their charges), then by name. Empty when nothing is unpaid. */
  people: z.array(paymentOptionPersonSchema),
});

/** `GET /api/months/:month/payment-options`: Record payment's From and For lists. */
export type PaymentOptionsResponse = z.infer<typeof paymentOptionsResponseSchema>;
