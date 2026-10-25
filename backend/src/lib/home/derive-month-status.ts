import type { HomeStatus } from "@splithouse/shared";

/** What was read for the month. Grows with each Home step. */
export interface MonthFacts {
  hasBill: boolean;
  /** An unsaved bill draft exists for the month. */
  hasDraft: boolean;
  /** How many people still have no monthly message. Only read once a bill is saved. */
  unsentMessages: number;
}

/**
 * Works out where the month is in its cycle.
 *
 * @param facts - What was read for the month.
 * @returns `draft` while an unsaved bill draft is waiting and no bill is saved, `unsent` while a
 * saved bill has people with no monthly message, `collecting` once every message is out, otherwise
 * `bill_missing`.
 */
export function deriveMonthStatus(facts: MonthFacts): HomeStatus {
  if (facts.hasBill) return facts.unsentMessages > 0 ? "unsent" : "collecting";
  return facts.hasDraft ? "draft" : "bill_missing";
}
