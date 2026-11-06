import { addMonths, formatMonthLabel, type SetupStartMonthResponse } from "@splithouse/shared";

/** Under This month after the 1st, when some due days have already passed. */
const OVERDUE_NOTE = "Due dates before today start as overdue";

/**
 * The month First run's household starts: the saved start month, or the current month when none is saved or the
 * saved one has passed, since no month before the current one can open.
 *
 * @param saved - The `Setup` row's start month, or null.
 * @param current - The current month, `YYYY-MM`.
 * @returns The month key.
 */
export function effectiveStartMonth(saved: string | null, current: string): string {
  return saved !== null && saved > current ? saved : current;
}

/** What `buildStartMonthPage` reads. */
export interface StartMonthPageInput {
  /** Today in Singapore, `YYYY-MM-DD`. */
  today: string;
  /** The `Setup` row's start month, or null. */
  saved: string | null;
}

/**
 * Builds the Start month page: This month, Next month, and Another month, which shows the saved month when it is
 * after next month. Selects the saved month's card, or This month.
 *
 * @param input - Today and the saved month.
 * @returns The page.
 */
export function buildStartMonthPage({ today, saved }: StartMonthPageInput): SetupStartMonthResponse {
  const current = today.slice(0, 7);
  const next = addMonths(current, 1);
  const startMonth = saved === null ? null : effectiveStartMonth(saved, current);
  const other = startMonth !== null && startMonth > next ? startMonth : null;
  const selected = other !== null ? "other" : startMonth === next ? "next" : "this";
  return {
    options: [
      {
        id: "this",
        kicker: "This month",
        month: current,
        title: formatMonthLabel(current),
        note: today.endsWith("-01") ? null : OVERDUE_NOTE,
      },
      { id: "next", kicker: "Next month", month: next, title: formatMonthLabel(next), note: null },
      {
        id: "other",
        kicker: "Another month",
        month: other,
        title: other === null ? "Choose from the calendar" : formatMonthLabel(other),
        note: null,
      },
    ],
    selected,
    pickerFrom: addMonths(current, 2),
    startMonth,
  };
}
