import { z } from 'zod';
import { dateKey, monthKey, positiveCents } from '../schemas/primitives';
import { badgeSchema } from './history';

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
  /** What the charge asks for, e.g. `$X,XXX.XX`. */
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
   * you received for November` (the charge's own month), button `Record $X,XXX.XX`. Choosing the
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
  /** e.g. `2 unpaid · $X,XXX.XX`, or `1 upcoming · $X,XXX.XX` when none is overdue or due within 7 days. */
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

/**
 * `GET /api/record-payment` query. The sheet is always about the active month.
 * - `personId`: who is picked in From, with nothing ticked; left out, nobody is picked.
 * - `chargeId`: the charge Mark paid was tapped on. Its payer (the person it is collected through, or
 *   the person themselves) is picked and the charge is ticked. Given with `personId`, the two must match.
 */
export const recordPaymentQuerySchema = z.object({
  personId: z.string().min(1).optional(),
  chargeId: z.string().min(1).optional(),
});

/** `GET /api/record-payment` query. */
export type RecordPaymentQuery = z.infer<typeof recordPaymentQuerySchema>;

/**
 * `POST /api/record-payment/preview`: the sheet again with a changed person or set of ticked charges.
 * Ids that are not in the person's For list are left out; an empty list ticks nothing. Nothing is stored.
 */
export const recordPaymentPreviewRequestSchema = z.object({
  personId: z.string().min(1),
  chargeIds: z.array(z.string().min(1)),
});

/** `POST /api/record-payment/preview` body. */
export type RecordPaymentPreviewRequest = z.infer<typeof recordPaymentPreviewRequestSchema>;

/**
 * `POST /api/record-payment`: the From person and the ticked charges, each paid in full, and the day.
 * There is no amount: each charge is stored as paid its own amount.
 */
export const recordPaymentRequestSchema = z.object({
  personId: z.string().min(1),
  chargeIds: z.array(z.string().min(1)).min(1),
  /** Today or earlier. Left out or null is refused with 422 `no_date`. */
  paidOn: dateKey.nullish(),
});

/** `POST /api/record-payment` body. */
export type RecordPaymentRequest = z.infer<typeof recordPaymentRequestSchema>;

/** `POST /api/record-payment`: what was paid and the months it touched, so the app can refetch them. */
export const recordPaymentResponseSchema = z.object({
  personId: z.string(),
  chargeIds: z.array(z.string()).min(1),
  /** Each paid charge's month, once, newest first. */
  months: z.array(monthKey).min(1),
});

/** `POST /api/record-payment` response. */
export type RecordPaymentResponse = z.infer<typeof recordPaymentResponseSchema>;

/** One person in the From list. */
export const recordPaymentFromOptionSchema = z.object({
  personId: z.string(),
  name: z.string(),
  /** e.g. `3 unpaid · $X,XXX.XX`, or `1 upcoming · $X,XXX.XX` when none is overdue or due within 7 days. */
  detail: z.string(),
  /** `danger` while one of their charges is overdue. */
  tone: z.enum(['default', 'danger']),
});

/** One person in the From list. */
export type RecordPaymentFromOption = z.infer<typeof recordPaymentFromOptionSchema>;

/** One unpaid charge in the For list, with its Checkbox. */
export const recordPaymentChargeRowSchema = z.object({
  chargeId: z.string(),
  /** e.g. `Rent · Nov`, or `Utilities · Sam · Nov` for a charge collected through the From person. */
  title: z.string(),
  /** e.g. `$X,XXX.XX`. */
  amount: z.string(),
  /** e.g. `Due 1 Nov`; null when the charge has no due date. */
  detail: z.string().nullable(),
  /** e.g. `Overdue 2 days`, `Due tomorrow`, `Due in 4 days`, or `Upcoming` with no due date. */
  chip: badgeSchema,
  ticked: z.boolean(),
});

/** One unpaid charge in the For list. */
export type RecordPaymentChargeRow = z.infer<typeof recordPaymentChargeRowSchema>;

/** A plain row in the confirm dialog: its label and value. */
export const recordPaymentConfirmRowSchema = z.object({ label: z.string(), value: z.string() });

/** A plain row in the confirm dialog. */
export type RecordPaymentConfirmRow = z.infer<typeof recordPaymentConfirmRowSchema>;

/**
 * The `Record this payment?` dialog for the ticked charges. The app adds the Received on row last,
 * with `receivedOnLabel` and the day picked in the sheet, as the date field shows it.
 */
export const recordPaymentConfirmSchema = z.object({
  /** `Record this payment?`. */
  title: z.string(),
  /** `Check the details before recording.`. */
  body: z.string(),
  /** `From`, and the person's name. */
  from: recordPaymentConfirmRowSchema,
  /**
   * `For`, and the ticked charge's title, or `3 charges` with two or more. `items` lists each ticked
   * charge (title as `label`, amount as `value`) when there are two or more, for the row to expand
   * to; null with one.
   */
  for: recordPaymentConfirmRowSchema.extend({ items: z.array(recordPaymentConfirmRowSchema).min(2).nullable() }),
  /** `Amount received`, and the ticked total. */
  amount: recordPaymentConfirmRowSchema,
  /** `Received on`. */
  receivedOnLabel: z.string(),
  /** e.g. `Record $X,XXX.XX`. */
  confirmLabel: z.string(),
  /** `Go back`. */
  cancelLabel: z.string(),
});

/** The `Record this payment?` dialog. */
export type RecordPaymentConfirm = z.infer<typeof recordPaymentConfirmSchema>;

/** `GET /api/record-payment` and `POST /api/record-payment/preview`: the Record payment sheet, ready to render. */
export const recordPaymentSheetSchema = z.object({
  /** The active month. */
  month: monthKey,
  /** `Record payment`. */
  title: z.string(),
  /** e.g. `Nov 2026`. */
  subtitle: z.string(),
  /** The `Everyone has paid` card, when nobody has anything left to pay; null otherwise. */
  settled: z.object({ title: z.string(), text: z.string() }).nullable(),
  from: z.object({
    /** Who is picked; null when nobody is. */
    personId: z.string().nullable(),
    /** Shown in the From field while nobody is picked: `Select person`, or `Everyone has paid`. */
    placeholder: z.string(),
    /**
     * Everyone with an unpaid charge to pay in the active month or earlier, most urgent first (the
     * earliest due date among their charges), then by name. Never the owner. A charge collected
     * through someone is listed under the person who collects it, never under its own person.
     */
    options: z.array(recordPaymentFromOptionSchema),
  }),
  for: z.object({
    /** Stands in for the list with nobody picked: `Select a person first`, or `No unpaid charges`. */
    empty: z.string().nullable(),
    /** e.g. `1 of 3 selected`; null with nobody picked. */
    count: z.string().nullable(),
    /**
     * The picked person's unpaid charges and those collected through them: the active month's first,
     * then earlier months', each by due date. Empty with nobody picked.
     */
    rows: z.array(recordPaymentChargeRowSchema),
  }),
  amount: z.object({
    /** The ticked charges' total, e.g. `$X,XXX.XX`; `$0.00` when nothing is ticked. Read-only. */
    value: z.string(),
    /** e.g. `Expected $X,XXX.XX · 2 charges`; null with nobody picked. */
    expected: z.string().nullable(),
    /** `Multiple charges can only be paid in full` with two or more ticked; null otherwise. */
    note: z.string().nullable(),
  }),
  /** Received on, filled in: today. */
  paidOn: dateKey,
  record: z.object({
    /** e.g. `Record $X,XXX.XX`, or `Record payment` while nothing is ticked. */
    label: z.string(),
    /** The save request without the day; null while nothing is ticked, so Record is disabled. */
    request: z.object({ personId: z.string(), chargeIds: z.array(z.string()).min(1) }).nullable(),
  }),
  /** The confirm dialog for the ticked charges; null while nothing is ticked. */
  confirm: recordPaymentConfirmSchema.nullable(),
});

/** `GET /api/record-payment` and `POST /api/record-payment/preview`: the Record payment sheet. */
export type RecordPaymentSheet = z.infer<typeof recordPaymentSheetSchema>;
