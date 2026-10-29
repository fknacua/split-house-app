import type { BillPaySheet } from '@splithouse/shared';

/** Props for {@link PayBillSheet}. */
export interface PayBillSheetProps {
  /** `YYYY-MM` key of the bill's month. */
  month: string;
}

/** Props for {@link BillSummary}. */
export interface BillSummaryProps {
  /** The sheet's text, or null while the bill loads. */
  sheet: BillPaySheet | null;
}
