import type { LucideIcon } from 'lucide-react-native';
import type {
  HouseholdAction,
  HouseholdCard as HouseholdCardData,
  HouseholdFact,
  HouseholdMonthOption,
  HouseholdPerson,
  HouseholdRecurring,
  HouseholdRecurringCharge,
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

/** The tabs under the landlord card. */
export type HouseholdTab = 'split' | 'people' | 'recurring';

/** Props for {@link HouseholdSkeleton}. */
export interface HouseholdSkeletonProps {
  /** The tab whose content to stand in for. */
  tab: HouseholdTab;
}

/** Props for {@link TabHeading}. */
export interface TabHeadingProps {
  /** The heading, e.g. `People`. */
  title: string;
  /** A line under the heading. */
  note?: string | null;
  /** The button at its right, e.g. `Add subtenant`. Null for none, e.g. People in First run before anyone is added. */
  actionLabel: string | null;
  /** The button's icon. */
  actionIcon: LucideIcon;
  /** Called by the button. */
  onAction: () => void;
}

/** Props for {@link PeopleSection}. */
export interface PeopleSectionProps {
  /** Everyone's cards. */
  people: HouseholdPerson[];
  /** The heading's Add subtenant button. */
  add: HouseholdAction;
  /** Opens where a button leads. */
  onOpen: (target: HouseholdTarget) => void;
}

/** Props for {@link HouseholdCard}. */
export interface HouseholdCardProps {
  /** The initial, color, name, facts and buttons. */
  card: HouseholdCardData;
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

/** Props for {@link RecurringSection}. */
export interface RecurringSectionProps {
  /** The card's text and the sheet's values. */
  recurring: HouseholdRecurring;
}

/** Props for {@link RecurringSheet}. */
export interface RecurringSheetProps {
  /** The sheet's titles and choices. */
  sheet: HouseholdRecurring['sheet'];
  /** The saved charge to edit, or null to add one. */
  charge: HouseholdRecurringCharge | null;
  /** Called on Remove charge, once the sheet has been told to close. */
  onRemove: (charge: HouseholdRecurringCharge) => void;
  /** Called after the sheet has closed, by any route. */
  onClose: () => void;
}

/** Props for {@link RemoveRecurringDialog}. */
export interface RemoveRecurringDialogProps {
  /** The charge to remove, or null when the dialog is closed. */
  charge: HouseholdRecurringCharge | null;
  /** Called on Cancel and after the charge is removed. */
  onClose: () => void;
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
