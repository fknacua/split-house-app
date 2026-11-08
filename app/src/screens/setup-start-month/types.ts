import type { SetupStartMonthOption, SetupStartMonthResponse } from '@splithouse/shared';

/** Which Start month card is selected: `this`, `next` or `other`. */
export type StartMonthChoice = SetupStartMonthOption['id'];

/** Props for {@link StartMonthForm}. */
export interface StartMonthFormProps {
  /** The page as the server wrote it on open. */
  page: SetupStartMonthResponse;
}

/** Props for {@link StartMonthCard}. */
export interface StartMonthCardProps {
  kicker: string;
  /** The month, e.g. `November 2026`, or `Choose from the calendar` before another month is picked. */
  title: string;
  /** Warning text under the title; null for none. */
  note: string | null;
  /** Draws the 2px `primary` border, and fills a radio card's ring. */
  selected: boolean;
  /** `radio` for This month and Next month; `calendar` for Another month, which opens the month picker. */
  indicator: 'radio' | 'calendar';
  onPress: () => void;
}
