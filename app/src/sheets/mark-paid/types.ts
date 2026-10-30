import type { ChargePaymentResponse, PaymentDifference } from '@splithouse/shared';

/** What the amount field and the button show for the amount typed so far. */
export interface AmountState {
  /** Under the amount field: the hint, or `null` while the amount differs (the Alert says it). */
  helper: string | null;
  /** The save button: the sheet's label, or `Save $X` while the amount differs. */
  actionLabel: string;
  /** The shortfall or overpayment for the info Alert, or `null` for none. */
  difference: PaymentDifference | null;
}

/** Props for {@link MarkPaidSheet}. */
export interface MarkPaidSheetProps {
  /** The charge being paid. */
  chargeId: string;
}

/** Props for {@link PaymentSummary}. */
export interface PaymentSummaryProps {
  /** The sheet, or null while it loads. */
  sheet: ChargePaymentResponse | null;
}
