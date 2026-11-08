import type { SetupPeopleResponse } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { buildPeoplePage } from "@/lib/setup/build-people";
import { requireStepsBefore } from "@/lib/setup/steps";
import { readFormContext, requireConfig, type HouseholdFormDb } from "@/services/household/household-form.service";

/**
 * Reads First run's People page from the first version. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The People page, ready to render.
 * @throws {ApiError} 409 `setup_done` once a month is open; 409 for the first step before People not done
 * (`start_month_first`, `rooms_first`).
 */
export async function getSetupPeople(db: HouseholdFormDb): Promise<SetupPeopleResponse> {
  const context = await readFormContext(db);
  if (!context.firstSetup) throw new ApiError(409, "setup_done", "The household is already set up.");
  requireStepsBefore("people", context.doneSteps);
  const { config, people } = requireConfig(context);
  return buildPeoplePage({ config, people });
}
