import type { HomeStatus } from "@splithouse/shared";

/** What was read for the month. Grows with each Home step. */
export interface MonthFacts {
  hasBill: boolean;
  /** An unsaved bill draft exists for the month. */
  hasDraft: boolean;
  /** How many people still have no monthly message. Only read once a bill is saved. */
  unsentMessages: number;
  /** Every charge of someone other than the owner has a payment. See {@link othersAllPaid}. */
  othersPaid: boolean;
  /** Every non-owner charge and the bill are paid. See {@link isMonthSettled}. */
  settled: boolean;
}

/**
 * Whether every charge of someone other than the owner has a payment recorded. A short payment
 * counts as paid, since nothing carries over.
 *
 * @param charges - The month's charges.
 * @param ownerIds - The people whose own charges are not payments to anyone.
 * @returns True once nothing is left to collect from anyone.
 */
export function othersAllPaid(
  charges: { personId: string; paidCents: number | null }[],
  ownerIds: Set<string>,
): boolean {
  return charges.every((c) => ownerIds.has(c.personId) || c.paidCents !== null);
}

/**
 * Whether the month is settled: a bill is saved and paid, and every charge of someone other than
 * the owner has a payment recorded (see {@link othersAllPaid}).
 *
 * @param charges - The month's charges.
 * @param ownerIds - The people whose own charges are not payments to anyone.
 * @param bill - The saved bill, or null when none is saved.
 * @returns True once nothing is left to collect and the bill is paid.
 */
export function isMonthSettled(
  charges: { personId: string; paidCents: number | null }[],
  ownerIds: Set<string>,
  bill: { paidCents: number | null } | null,
): boolean {
  if (!bill || bill.paidCents === null) return false;
  return othersAllPaid(charges, ownerIds);
}

/**
 * Works out where the month is in its cycle.
 *
 * @param facts - What was read for the month.
 * @returns `settled` once everything is paid, `draft` while an unsaved bill draft is waiting and no
 * bill is saved, `unsent` while a saved bill has people with no monthly message, `bill_due` once
 * every message is out and everyone has paid but the bill is not, `collecting` while payments are
 * still coming in, otherwise `bill_missing`.
 */
export function deriveMonthStatus(facts: MonthFacts): HomeStatus {
  if (facts.hasBill) {
    if (facts.settled) return "settled";
    if (facts.unsentMessages > 0) return "unsent";
    return facts.othersPaid ? "bill_due" : "collecting";
  }
  return facts.hasDraft ? "draft" : "bill_missing";
}
