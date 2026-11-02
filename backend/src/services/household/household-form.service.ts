import { parseHouseholdConfig, type HouseholdFormQuery, type HouseholdFormResponse, type PersonColor } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { buildHouseholdForm, startsFromMonths } from "@/lib/household/build-household-form";
import { getActiveMonth, type ActiveMonthDb } from "@/services/months/active-month.service";

const VERSION_SELECT = { startsFromMonth: true, schemaVersion: true, config: true } as const;
const PERSON_SELECT = { id: true, name: true, whatsappE164: true, color: true, isOwner: true } as const;

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface HouseholdFormDb extends ActiveMonthDb {
  month: ActiveMonthDb["month"] & {
    findUnique(args: {
      where: { month: string };
      select: { householdVersion: { select: { schemaVersion: true; config: true } } };
    }): Promise<{ householdVersion: { schemaVersion: number; config: unknown } } | null>;
  };
  householdVersion: {
    findMany(args: {
      orderBy: { startsFromMonth: "desc" };
      select: typeof VERSION_SELECT;
    }): Promise<{ startsFromMonth: string; schemaVersion: number; config: unknown }[]>;
  };
  person: {
    findMany(args: {
      select: typeof PERSON_SELECT;
    }): Promise<{ id: string; name: string; whatsappE164: string | null; color: PersonColor; isOwner: boolean }[]>;
  };
}

/**
 * Reads one person's form for a month: the version an opened month is pinned to, otherwise the newest
 * starting on or before the month. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param query - The person, and the month to read (View passes "Showing:"; missing means the first Starts from option).
 * @returns The Edit and View screens.
 * @throws {ApiError} 409 `no_household` before first run; 404 `no_version` for a month before every
 * version; 404 `no_person` for an unknown person or someone not in that month's version.
 */
export async function getHouseholdForm(db: HouseholdFormDb, query: HouseholdFormQuery): Promise<HouseholdFormResponse> {
  const [activeMonth, versions, people] = await Promise.all([
    getActiveMonth(db),
    db.householdVersion.findMany({ orderBy: { startsFromMonth: "desc" }, select: VERSION_SELECT }),
    db.person.findMany({ select: PERSON_SELECT }),
  ]);
  if (versions.length === 0) throw new ApiError(409, "no_household", "Set up the household first.");

  const startsFromOptions = startsFromMonths(activeMonth, versions.map((v) => v.startsFromMonth));
  const month = query.month ?? startsFromOptions[0];
  const opened = await db.month.findUnique({
    where: { month },
    select: { householdVersion: { select: { schemaVersion: true, config: true } } },
  });
  const version = opened?.householdVersion ?? versions.find((v) => v.startsFromMonth <= month);
  if (!version) throw new ApiError(404, "no_version", "The household has no setup for this month.");

  const config = parseHouseholdConfig(version.schemaVersion, version.config);
  const known = people.some((p) => p.id === query.personId);
  if (!known || !config.people.some((p) => p.personId === query.personId)) {
    throw new ApiError(404, "no_person", "This person is not in the household for this month.");
  }
  return buildHouseholdForm({ month, startsFromOptions, config, personId: query.personId, people });
}
