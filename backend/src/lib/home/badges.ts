import type { BadgeContent } from "@splithouse/shared";

/**
 * Every badge Home shows, keyed by name. The builders pick from here instead of writing
 * labels and tones inline, so a badge changes in one place. Later Home steps add their own.
 */
export const HOME_BADGES = {
  paid: { label: "Paid", tone: "success" },
  dueToday: { label: "Due today", tone: "info" },
  upcoming: { label: "Upcoming", tone: "neutral" },
  needsBill: { label: "Needs bill", tone: "neutral" },
  billNotUploaded: { label: "Not uploaded", tone: "neutral" },
  notSent: { label: "Not sent", tone: "primary" },
} as const satisfies Record<string, BadgeContent>;

/**
 * The bill row's badge while the bill is not yet due. Overdue bills get their chip with the
 * full chip rules in 5.4, so a bill due today or earlier shows `Due today` for now.
 *
 * @param days - Whole days from today to the bill's due date.
 * @returns `In 14 days`, `In 1 day`, or `Due today`.
 */
export function billDueBadge(days: number): BadgeContent {
  if (days <= 0) return HOME_BADGES.dueToday;
  return { label: days === 1 ? "In 1 day" : `In ${days} days`, tone: "neutral" };
}
