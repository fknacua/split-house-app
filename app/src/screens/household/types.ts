import type {
  HouseholdAction,
  HouseholdFact,
  HouseholdMonthOption,
  HouseholdPerson,
  HouseholdSplitRow,
  HouseholdSplitSegment,
  HouseholdStat,
} from '@splithouse/shared';

/** Props for {@link LandlordCard}. */
export interface LandlordCardProps {
  /** The stat tiles. */
  stats: HouseholdStat[];
  /** The Edit badge on the card. */
  edit: HouseholdAction;
}

/** Props for {@link LandlordStat}. */
export interface LandlordStatProps {
  /** The value and label of the tile. */
  stat: HouseholdStat;
}

/** Props for {@link MonthSelect}. */
export interface MonthSelectProps {
  /** The months to choose from, newest first. */
  options: HouseholdMonthOption[];
  /** `YYYY-MM` key of the month shown, or of the one being loaded. */
  month: string;
  /** Text to show when `month` is not in the list. */
  fallbackLabel: string;
  /** Called with the picked month's key. */
  onChange: (month: string) => void;
}

/** Props for {@link PersonCard}. */
export interface PersonCardProps {
  /** The initial, color, name, sub line, facts and buttons. */
  person: HouseholdPerson;
}

/** Props for {@link PersonFact}. */
export interface PersonFactProps {
  /** The label and value. */
  fact: HouseholdFact;
}

/** Props for {@link SplitSection}. */
export interface SplitSectionProps {
  /** Rent, utilities and aircon. */
  rows: HouseholdSplitRow[];
}

/** Props for {@link SplitRow}. */
export interface SplitRowProps {
  /** The label, total, bar segments and legend. */
  row: HouseholdSplitRow;
  /** Draws the rule above the row. False for the first row of the card. */
  separated: boolean;
}

/** Props for {@link PersonSplitBar}. */
export interface PersonSplitBarProps {
  /** Each person's width and color. */
  segments: HouseholdSplitSegment[];
  /** What the split shows, read out by screen readers. */
  accessibilityLabel: string;
}

/** Props for {@link SplitLegendItem}. */
export interface SplitLegendItemProps {
  /** The person's color, name and amount. */
  segment: HouseholdSplitSegment;
}

/** Props for {@link SplitSkeletonRow}. */
export interface SplitSkeletonRowProps {
  /** Draws the rule above the row. False for the first row of the card. */
  separated: boolean;
}
