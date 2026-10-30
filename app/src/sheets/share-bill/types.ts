import type { BillShareSummary } from '@splithouse/shared';

/** What the Share bill sheet sends. */
export type ShareChoice = 'pdf' | 'summary';

/** Props for {@link ShareBillSheet}. */
export interface ShareBillSheetProps {
  /** `YYYY-MM` key of the bill's month. */
  month: string;
}

/** Props for {@link SummaryPreview}. */
export interface SummaryPreviewProps {
  summary: BillShareSummary;
}
