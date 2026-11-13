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
  /** `Monthly message sent`, `Nudged`, or `Payment $950.00` (the amount applied to this charge). */
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
  /** The header title, e.g. `Rent · Tenant 2`. */
  title: z.string(),
  /** The header sub line, e.g. `November 2026`. */
  monthName: z.string(),
  /** The amount card. */
  amount: z.object({
    /** e.g. `$950.00`. */
    value: z.string(),
    /** The same chip as the charge's Home row. */
    chip: badgeSchema,
    /** A line inside the card, e.g. the payment check on a due-today charge. Null when there is none. */
    note: z.string().nullable(),
  }),
  /** Payer, Payment routing, Due (left out when no due day is known) and Payment status, in order. */
  facts: z.array(chargeDetailsFactSchema),
  /** Newest first. Empty shows the shared `No activity yet` card. */
  activity: z.array(chargeDetailsActivitySchema),
  /** The footer's buttons, top to bottom: Nudge or Nudge again, then Mark paid. Empty hides the footer. */
  footer: z.array(homeActionSchema),
});

/** `GET /api/charges/:id/details`: one charge, ready to render. */
export type ChargeDetailsResponse = z.infer<typeof chargeDetailsResponseSchema>;
