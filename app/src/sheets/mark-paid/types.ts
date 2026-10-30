import type { ChargePaymentResponse } from '@splithouse/shared';

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
