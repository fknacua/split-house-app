import type { BadgeContent } from "@splithouse/shared";

/**
 * Every fixed badge Home shows, keyed by name. The builders pick from here instead of writing
 * labels and tones inline, so a badge changes in one place. Badges with a number in them are
 * made by `overdueBadge`, `chargeDueBadge` and `billDueBadge`. Later Home steps add their own.
 */
export const HOME_BADGES = {
  paid: { label: "Paid", tone: "success" },
  dueToday: { label: "Due today", tone: "info" },
  dueTomorrow: { label: "Due tomorrow", tone: "info" },
  sentUnpaid: { label: "Sent, unpaid", tone: "neutral" },
  upcoming: { label: "Upcoming", tone: "neutral" },
  needsBill: { label: "Needs bill", tone: "neutral" },
  billNotUploaded: { label: "Not uploaded", tone: "neutral" },
  notSent: { label: "Not sent", tone: "primary" },
} as const satisfies Record<string, BadgeContent>;

/** A charge due within this many days shows `Due in N days`. Further out it is `Sent, unpaid` or `Upcoming`. */
export const DUE_SOON_DAYS = 3;

/**
 * The chip for something past its due date.
 *
 * @param daysLate - Whole days since the due date, at least 1.
 * @returns `Overdue 1 day`, `Overdue 2 days`, and so on.
 */
export function overdueBadge(daysLate: number): BadgeContent {
  return { label: daysLate === 1 ? "Overdue 1 day" : `Overdue ${daysLate} days`, tone: "danger" };
}

/**
 * The chip for an unpaid charge whose due date is close or past.
 *
 * @param days - Whole days from today to the due date. Negative once it is past.
 * @returns `Overdue N days`, `Due today`, `Due tomorrow` or `Due in N days` (up to `DUE_SOON_DAYS`),
 * or null when the due date is further out and the caller picks `Sent, unpaid` or `Upcoming`.
 */
export function chargeDueBadge(days: number): BadgeContent | null {
  if (days < 0) return overdueBadge(-days);
  if (days === 0) return HOME_BADGES.dueToday;
  if (days === 1) return HOME_BADGES.dueTomorrow;
  if (days <= DUE_SOON_DAYS) return { label: `Due in ${days} days`, tone: "neutral" };
  return null;
}

/**
 * The bill row's badge while the bill is unpaid.
 *
 * @param days - Whole days from today to the bill's due date. Negative once it is past.
 * @returns `Overdue N days`, `Due today`, `In 1 day`, or `In N days`.
 */
export function billDueBadge(days: number): BadgeContent {
  if (days < 0) return overdueBadge(-days);
  if (days === 0) return HOME_BADGES.dueToday;
  return { label: days === 1 ? "In 1 day" : `In ${days} days`, tone: "neutral" };
}
