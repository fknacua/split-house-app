import { formatDateShort, type BadgeContent } from "@splithouse/shared";

/**
 * Every fixed badge Home and View bill show, keyed by name. The builders pick from here instead of
 * writing labels and tones inline, so a badge changes in one place. Badges with a number or a date
 * in them are made by `overdueBadge`, `chargeDueBadge`, `billDueBadge`, `billDueInBadge` and
 * `paidOnBadge`. Later steps add their own.
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
  /** View bill: the user's own share, covered from the start. */
  covered: { label: "Covered", tone: "success" },
  /** View bill: a share whose message is out and is not paid or overdue. */
  waiting: { label: "Waiting", tone: "neutral" },
  /** Recipient: the monthly message is out and nothing is paid. Its board writes it with a dot, unlike Home's. */
  recipientSentUnpaid: { label: "Sent · unpaid", tone: "neutral" },
  /** Recipient: a charge is past its due date; the rows below say which and by how long. */
  recipientOverdue: { label: "Overdue", tone: "danger" },
  /** Recipient: every charge has a payment, but less came in than was asked. */
  recipientPaidLess: { label: "Paid less", tone: "warning" },
  /** Recipient: every charge has a payment, and more came in than was asked (not drawn). */
  recipientPaidMore: { label: "Paid more", tone: "info" },
} as const satisfies Record<string, BadgeContent>;

/** A charge due within this many days shows `Due in N days`. Further out it is `Sent, unpaid` or `Upcoming`. */
const DUE_SOON_DAYS = 3;

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
function chargeDueBadge(days: number): BadgeContent | null {
  if (days < 0) return overdueBadge(-days);
  if (days === 0) return HOME_BADGES.dueToday;
  if (days === 1) return HOME_BADGES.dueTomorrow;
  if (days <= DUE_SOON_DAYS) return { label: `Due in ${days} days`, tone: "neutral" };
  return null;
}

/**
 * The chip for a charge, first match wins: Paid, Not sent, Overdue N days, Due today, Due tomorrow,
 * Due in N days (up to three), Sent unpaid, Upcoming. Home's rows and Recipient's charge rows use it.
 *
 * @param flags - Where the charge stands.
 * @param flags.paid - The charge is paid.
 * @param flags.messageUnsent - A utilities charge whose payer has no monthly message yet.
 * @param flags.days - Whole days to the due date, negative once past. Null when no due day is known.
 * @param flags.sent - The payer's monthly message has been opened.
 * @returns The chip.
 */
export function chargeBadge(flags: {
  paid: boolean;
  messageUnsent: boolean;
  days: number | null;
  sent: boolean;
}): BadgeContent {
  if (flags.paid) return HOME_BADGES.paid;
  if (flags.messageUnsent) return HOME_BADGES.notSent;
  const due = flags.days === null ? null : chargeDueBadge(flags.days);
  if (due) return due;
  return flags.sent ? HOME_BADGES.sentUnpaid : HOME_BADGES.upcoming;
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

/**
 * View bill's chip on an unpaid bill, which counts every day down rather than switching to `In N days`.
 *
 * @param days - Whole days from today to the bill's due date. Negative once it is past.
 * @returns `Overdue N days`, `Due today`, `Due tomorrow`, or `Due in N days`.
 */
export function billDueInBadge(days: number): BadgeContent {
  return chargeDueBadge(days) ?? { label: `Due in ${days} days`, tone: "neutral" };
}

/**
 * The chip for something paid, with the day when it is known.
 *
 * @param paidOn - The date key it was paid on, or null.
 * @returns e.g. `Paid 5 Nov`, or `Paid` with no date.
 */
export function paidOnBadge(paidOn: string | null): BadgeContent {
  return paidOn === null ? HOME_BADGES.paid : { label: `Paid ${formatDateShort(paidOn)}`, tone: "success" };
}
