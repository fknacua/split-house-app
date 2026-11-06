import { SETUP_STEP_IDS, type SetupStepId } from "@splithouse/shared";
import { ApiError } from "@/lib/api";

/** The steps First run needs before it can finish. Custom messages is optional. */
export const REQUIRED_STEPS: readonly SetupStepId[] = ["startMonth", "rentAndRooms", "people", "householdSplits"];

/** The 409 for each step an edit is refused for, when it is the first one not done. */
const NOT_DONE: Record<SetupStepId, { code: string; message: string }> = {
  startMonth: { code: "start_month_first", message: "Choose the start month first." },
  rentAndRooms: { code: "rooms_first", message: "Save Rent & rooms first." },
  people: { code: "people_first", message: "Save people first." },
  householdSplits: { code: "splits_first", message: "Save Household splits first." },
  messages: { code: "messages_first", message: "Save Custom messages first." },
};

/**
 * Keeps only known step ids, in step order, so a stored list reads the same however it was written.
 *
 * @param stored - The ids on the `Setup` row.
 * @returns The done steps, in order.
 */
export function doneStepsOf(stored: readonly string[]): SetupStepId[] {
  return SETUP_STEP_IDS.filter((id) => stored.includes(id));
}

/**
 * Whether every required step is done, so First run can finish.
 *
 * @param done - The done steps.
 * @returns True when Start month, Rent & rooms, People and Household splits are all done.
 */
export function requiredStepsDone(done: readonly SetupStepId[]): boolean {
  return REQUIRED_STEPS.every((id) => done.includes(id));
}

/**
 * Refuses work on a step while a step before it is not done. Welcome goes in order, so the app never shows this; it
 * is the server's backstop.
 *
 * @param step - The step being worked on.
 * @param done - The done steps.
 * @throws {ApiError} 409 for the first earlier step not done: `start_month_first`, `rooms_first`, `people_first` or
 * `splits_first`.
 */
export function requireStepsBefore(step: SetupStepId, done: readonly SetupStepId[]): void {
  const missing = SETUP_STEP_IDS.slice(0, SETUP_STEP_IDS.indexOf(step)).find((id) => !done.includes(id));
  if (missing) throw new ApiError(409, NOT_DONE[missing].code, NOT_DONE[missing].message);
}
