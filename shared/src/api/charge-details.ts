import { z } from 'zod';
import { monthKey } from '../schemas/primitives';
import { badgeSchema } from './history';
import { homeActionSchema } from './home';

/** One row of the Details card: a plain value, or a value shown as a pill (Payment status). */
export const chargeDetailsFactSchema = z.discriminatedUnion('kind', [
  /** e.g. `Payer` with `Tenant 2`, `Payment routing` with `Via Primary Tenant`, `Due` with `01 Nov 2026`. */
  z.object({ kind: z.literal('text'), label: z.string(), value: z.string() }),
  /** e.g. `Payment status` with an `Unpaid` (neutral) or `Paid` (success) pill. */
  z.object({ kind: z.literal('pill'), label: z.string(), badge: badgeSchema }),
]);

/** One row of the Details card: a plain value, or a value shown as a pill (Payment status). */
export type ChargeDetailsFact = z.infer<typeof chargeDetailsFactSchema>;

/** One line of the Activity card. */
export const chargeDetailsActivitySchema = z.object({
  /**
   * `Monthly message sent`, `Nudged`, `Payment $950.00` (the amount applied to this charge), `Correction -$5.00` (a
   * correction to this charge), or a refund's own `Refund -$5.00`.
   */
  title: z.string(),
  /** e.g. `02 Nov 2026`. */
  date: z.string(),
});

/** One line of the Activity card. */
export type ChargeDetailsActivity = z.infer<typeof chargeDetailsActivitySchema>;

/** `GET /api/charges/:id/details`: one charge, ready to render. */
export const chargeDetailsResponseSchema = z.object({
  chargeId: z.string(),
  /** `YYYY-MM`: the charge's month. */
  month: monthKey,
  /** The header title, e.g. `Rent · Tenant 2`, or `Correction · Tenant 2` for a correction. */
  title: z.string(),
  /** The header sub line, e.g. `November 2026`. */
  monthName: z.string(),
  /** The amount card. */
  amount: z.object({
    /** e.g. `$950.00`. */
    value: z.string(),
    /** The same chip as the charge's Home row (`Refunded` for a refund). */
    chip: badgeSchema,
    /**
     * A line inside the card: the payment check on a due-today charge, or `Corrected to $X.XX · 1 correction` on a
     * charge that has been corrected. Null when there is none.
     */
    note: z.string().nullable(),
  }),
  /**
   * Payer, Payment routing, Fixes (a correction: what it fixes, e.g. `Utilities · Oct 2026`), Due (left out when no
   * due day is known, and for a refund) and Payment status (`Refunded 21 Nov` for a refund), in order.
   */
  facts: z.array(chargeDetailsFactSchema),
  /** Newest first. Empty shows the shared `No activity yet` card. */
  activity: z.array(chargeDetailsActivitySchema),
  /**
   * The footer's buttons, top to bottom: Nudge or Nudge again, then Mark paid, on an unpaid charge; Edit payment
   * on a paid one, with Add correction when it can be corrected. A correction ends with Delete correction (a
   * refund has only that). Empty hides the footer.
   */
  footer: z.array(homeActionSchema),
  /** The `Delete this correction?` dialog Delete correction opens; null for any other charge. */
  deleteCorrection: z
    .object({
      /** `Delete this correction?`. */
      title: z.string(),
      /** e.g. `It’s removed from Utilities · Tenant 2 and from History. Its payment is removed too.` */
      body: z.string(),
      /** `Delete`. */
      confirmLabel: z.string(),
      /** `Keep`. */
      cancelLabel: z.string(),
    })
    .nullable(),
});

/** `GET /api/charges/:id/details`: one charge, ready to render. */
export type ChargeDetailsResponse = z.infer<typeof chargeDetailsResponseSchema>;

/** `DELETE /api/charges/:id`: the correction removed, and the months to refetch. */
export const deleteCorrectionResponseSchema = z.object({
  chargeId: z.string(),
  /** The month that held the correction. */
  month: monthKey,
  /** The month it fixed, whose History banner it had. */
  correctsMonth: monthKey,
});

/** `DELETE /api/charges/:id` response. */
export type DeleteCorrectionResponse = z.infer<typeof deleteCorrectionResponseSchema>;
