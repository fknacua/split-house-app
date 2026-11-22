import { z } from 'zod';
import { dateKey, monthKey } from '../schemas/primitives';

/** A read-only row of the Edit payment sheet, or of its confirm dialog: a label and its value. */
export const editPaymentRowSchema = z.object({ label: z.string(), value: z.string() });

/** A read-only row of the Edit payment sheet. */
export type EditPaymentRow = z.infer<typeof editPaymentRowSchema>;

/** `GET /api/charges/:id/payment`: the Edit payment sheet for one paid charge, ready to render. */
export const editPaymentSheetSchema = z.object({
  chargeId: z.string(),
  /** `YYYY-MM`: the charge's month, so the app can refetch the screens that show it. */
  month: monthKey,
  /** `Edit payment`. */
  title: z.string(),
  /** The charge's month, e.g. `Nov 2026`. */
  subtitle: z.string(),
  /**
   * From (who paid), For (e.g. `Rent · Nov 2026`, or `Utilities · Sam · Nov 2026` for a charge
   * collected through the payer) and Amount received, in order. Read-only.
   */
  rows: z.array(editPaymentRowSchema).length(3),
  /** Received on as stored: the day the field starts on. */
  paidOn: dateKey,
  /** The destructive `Remove payment` button and the dialog it opens. */
  remove: z.object({
    /** `Remove payment`. */
    label: z.string(),
    confirm: z.object({
      /** `Remove this payment?`. */
      title: z.string(),
      /** e.g. `Rent · Tenant 2 will show as unpaid again.`. */
      body: z.string(),
      /** `Remove`. */
      confirmLabel: z.string(),
      /** `Keep`. */
      cancelLabel: z.string(),
    }),
  }),
});

/** `GET /api/charges/:id/payment`: the Edit payment sheet. */
export type EditPaymentSheet = z.infer<typeof editPaymentSheetSchema>;

/** `PATCH /api/charges/:id/payment`: the new Received on. */
export const editPaymentRequestSchema = z.object({
  /** Today or earlier. Left out or null is refused with 422 `no_date`. */
  paidOn: dateKey.nullish(),
});

/** `PATCH /api/charges/:id/payment` body. */
export type EditPaymentRequest = z.infer<typeof editPaymentRequestSchema>;

/** `PATCH` and `DELETE /api/charges/:id/payment`: the charge and its month, so the app can refetch them. */
export const editPaymentResponseSchema = z.object({
  chargeId: z.string(),
  month: monthKey,
  /** The stored Received on; null once the payment is removed. */
  paidOn: dateKey.nullable(),
});

/** `PATCH` and `DELETE /api/charges/:id/payment` response. */
export type EditPaymentResponse = z.infer<typeof editPaymentResponseSchema>;
