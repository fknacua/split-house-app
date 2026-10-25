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
 * saved bill has people with no monthly message, otherwise `bill_missing`.
 * @throws {Error} When every message is sent: the later statuses are built in the next Home steps.
 */
export function deriveMonthStatus(facts: MonthFacts): HomeStatus {
  if (facts.hasBill) {
    if (facts.unsentMessages > 0) return "unsent";
    throw new Error("Month statuses after unsent are not built yet");
  }
  return facts.hasDraft ? "draft" : "bill_missing";
}
