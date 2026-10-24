import type { HistoryGroup, HistoryMonth } from '@splithouse/shared';

/** Props for {@link HistoryGroupSection}. */
export interface HistoryGroupSectionProps {
  /** One year of the History list. */
  group: HistoryGroup;
}

/** Props for {@link HistoryMonthRow}. */
export interface HistoryMonthRowProps {
  /** The month to draw. */
  month: HistoryMonth;
  /** Draws the separator above the row. False for the first row of a card. */
  separated: boolean;
}

/** Props for {@link HistorySkeletonRow}. */
export interface HistorySkeletonRowProps {
  /** Width of the name line, as a percentage. */
  nameWidth: `${number}%`;
  /** Width of the detail line, as a percentage. */
  detailWidth: `${number}%`;
  /** Width of the chip, in px. */
  chipWidth: number;
  /** Draws the separator above the row. False for the first row of a card. */
  separated: boolean;
}
