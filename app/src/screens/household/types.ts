import type {
  HouseholdAction,
  HouseholdFact,
  HouseholdMonthOption,
  HouseholdPerson,
  HouseholdSplitRow,
  HouseholdSplitSegment,
  HouseholdStat,
  HouseholdTarget,
} from '@splithouse/shared';

/** Props for {@link LandlordCard}. */
export interface LandlordCardProps {
  /** The line above the amount, e.g. `Landlord rent · due 1st of the month`. */
  label: string;
  /** The landlord rent, e.g. `$X,XXX.XX`. */
  amount: string;
  /** The stat tiles. */
  stats: HouseholdStat[];
  /** The Edit badge on the card. */
  edit: HouseholdAction;
  /** Opens the card's edit target. */
  onOpen: (target: HouseholdTarget) => void;
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
  /** The initial, color, name, facts and buttons. */
  person: HouseholdPerson;
  /** Opens where a button leads. */
  onOpen: (target: HouseholdTarget) => void;
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
  /** The heading's Edit splits button. */
  edit: HouseholdAction;
  /** Opens where the button leads. */
  onOpen: (target: HouseholdTarget) => void;
}

/** Props for {@link SplitRow}. */
export interface SplitRowProps {
  /** The label, total, bar segments, legend and note. */
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
  /** The person's color, name, amount and whether they are in the total. */
  segment: HouseholdSplitSegment;
}

/** Props for {@link SplitSkeletonRow}. */
export interface SplitSkeletonRowProps {
  /** Draws the rule above the row. False for the first row of the card. */
  separated: boolean;
}
