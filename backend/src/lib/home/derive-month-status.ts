import type { HomeStatus } from "@splithouse/shared";

/** What was read for the month. Grows with each Home step. */
export interface MonthFacts {
  hasBill: boolean;
  /** An unsaved bill draft exists for the month. */
  hasDraft: boolean;
}

/**
 * Works out where the month is in its cycle.
 *
 * @param facts - What was read for the month.
 * @returns `draft` while an unsaved bill draft is waiting, otherwise `bill_missing`.
 * @throws {Error} When a bill exists: the later statuses are built in the next Home steps.
 */
export function deriveMonthStatus(facts: MonthFacts): HomeStatus {
  if (facts.hasBill) throw new Error("Month statuses after draft are not built yet");
  return facts.hasDraft ? "draft" : "bill_missing";
}
