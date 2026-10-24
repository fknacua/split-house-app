import { SETUP_STEP_IDS, type HouseholdConfig, type SetupStep, type SetupStepId } from "@splithouse/shared";

const OPTIONAL: ReadonlySet<SetupStepId> = new Set(["messages", "reminders"]);

/**
 * Works out the first-run checklist from the newest household version (null when there is none).
 *
 * - Rent & rooms: the landlord rent or a tenant's room rent is set.
 * - People: at least one tenant is on the household.
 * - Your split: the owner and the primary tenant exist, so the remainder has someone to share
 *   between. (A saved version always has its percentages adding to 100%.)
 * - Messages and Reminders are optional and nothing records them yet, so they stay not done.
 *   Reminders depend on the phone's notification permission, which the server cannot see.
 *
 * @param config - The parsed config of the newest version, or null before first run.
 */
export function deriveSetupProgress(config: HouseholdConfig | null): SetupStep[] {
  const done: Record<SetupStepId, boolean> = {
    rentAndRooms:
      config !== null &&
      (config.categories.rent.sharedRentCents > 0 || config.people.some((p) => p.rentCents > 0)),
    people: config !== null && config.people.some((p) => p.role === "TENANT"),
    yourSplit: config !== null && config.people.some((p) => p.role === "PRIMARY"),
    messages: false,
    reminders: false,
  };
  return SETUP_STEP_IDS.map((id) => ({ id, optional: OPTIONAL.has(id), done: done[id] }));
}
