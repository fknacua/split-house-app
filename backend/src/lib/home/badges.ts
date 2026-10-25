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
} as const satisfies Record<string, BadgeContent>;
