import type { ReactNode } from 'react';
import type {
  ChargePaymentResponse,
  PaymentDifference,
} from '@splithouse/shared';

/** The word the button uses for an amount that differs: Mark paid's `Save $X`, Record payment's `Record $X`. */
export type PaymentVerb = 'Save' | 'Record';

/** What the amount field and the button show for the amount typed so far. */
export interface AmountState {
  /** Under the amount field: the hint, or `null` while the amount differs (the Alert says it). */
  helper: string | null;
  /** The save button: the sheet's label, or `Save $X` / `Record $X` while the amount differs. */
  actionLabel: string;
  /** The shortfall or overpayment for the info Alert, or `null` for none. */
  difference: PaymentDifference | null;
}

/** Props for {@link MarkPaidSheet}. */
export interface MarkPaidSheetProps {
  /** The charge being paid. */
  chargeId: string;
}

/** Props for {@link PaymentSheet}. */
export interface PaymentSheetProps {
  /** The charge's sheet, or null while it loads. */
  sheet: ChargePaymentResponse | null;
  /** The load's error; a refusal from the server shows its message in a danger Alert. */
  loadError: unknown;
  /** The button's word while the amount differs. */
  verb: PaymentVerb;
  /** The title while the sheet loads. */
  fallbackTitle: string;
  /** The button while the sheet loads. */
  fallbackActionLabel: string;
  /** Fields above the summary, such as Record payment's From and For. */
  renderFields?: (state: { saving: boolean }) => ReactNode;
}

/** Props for {@link PaymentSummary}. */
export interface PaymentSummaryProps {
  /** The sheet, or null while it loads. */
  sheet: ChargePaymentResponse | null;
}
