import type { HistoryBill, HistoryPayment } from '@splithouse/shared';

/** Props for {@link BillCard}. */
export interface BillCardProps {
  /** `YYYY-MM` key of the month, for the View bill link. */
  month: string;
  /** The month's utilities bill card. */
  bill: HistoryBill;
}

/** Props for {@link PaymentRow}. */
export interface PaymentRowProps {
  /** The charge to draw. */
  payment: HistoryPayment;
  /** Draws the separator above the row. False for the first row of the card. */
  separated: boolean;
}
