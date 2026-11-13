import type { HomeAction } from "@splithouse/shared";

/** Where a charge stands, as much as its actions need. */
export interface ChargeActionFlags {
  chargeId: string;
  month: string;
  /** Who pays it: the person it is via, else the person who owes it. */
  payerId: string;
  /** The charge is paid via someone else. */
  routed: boolean;
  paid: boolean;
  /** Unpaid and past its due date. */
  overdue: boolean;
  /** The payer's monthly message has been opened. */
  sent: boolean;
  /** The charge has had a nudge opened before. */
  nudged: boolean;
}

/**
 * The buttons for an unpaid charge, shared by its Home row and its Charge details footer so both
 * show the same thing. Mark paid is on every unpaid charge, even before the monthly message goes out.
 * Nudge (or Nudge again once nudged) comes first, and only on an overdue charge whose payer's
 * monthly message is out, since a nudge follows the message, and never on a charge paid via someone
 * else. Nudge opens Recipient with that charge until the Nudge sheet exists.
 *
 * @param flags - Where the charge stands.
 * @returns The buttons in order; empty once the charge is paid.
 */
export function chargeActions(flags: ChargeActionFlags): HomeAction[] {
  if (flags.paid) return [];
  const markPaid: HomeAction = {
    label: "Mark paid",
    tone: "outline",
    icon: "check",
    target: { kind: "mark-paid", chargeId: flags.chargeId },
  };
  if (!flags.overdue || !flags.sent || flags.routed) return [markPaid];
  const nudge: HomeAction = {
    label: flags.nudged ? "Nudge again" : "Nudge",
    tone: "warning",
    icon: "bell",
    target: { kind: "recipient", month: flags.month, personId: flags.payerId, chargeId: flags.chargeId },
  };
  return [nudge, markPaid];
}
