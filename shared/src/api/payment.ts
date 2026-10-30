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
  /** e.g. `Mark paid`. */
  title: z.string(),
  /** Home's row title and the charge's month, e.g. `Rent · Jordan · November`. */
  subtitle: z.string(),
  /** What the charge asks for, e.g. `$1,963.65`. */
  expected: z.string(),
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
