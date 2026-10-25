import type { HomeStatus } from "@splithouse/shared";

/** What was read for the month. Grows with each Home step. */
export interface MonthFacts {
  hasBill: boolean;
}

/**
 * Works out where the month is in its cycle.
 *
 * @param facts - What was read for the month.
 * @returns `bill_missing` while no bill is saved.
 * @throws {Error} When a bill exists: the later statuses are built in the next Home steps.
 */
export function deriveMonthStatus(facts: MonthFacts): HomeStatus {
  if (facts.hasBill) throw new Error("Month statuses after bill_missing are not built yet");
  return "bill_missing";
}
