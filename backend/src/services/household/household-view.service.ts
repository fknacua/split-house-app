import { addMonths, parseHouseholdConfig, type HouseholdViewResponse, type PersonColor } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { buildHouseholdView } from "@/lib/household/build-household-view";
import { getActiveMonth, type ActiveMonthDb } from "@/services/months/active-month.service";

const VERSION_SELECT = { startsFromMonth: true, schemaVersion: true, config: true } as const;
const PERSON_SELECT = { id: true, name: true, color: true } as const;

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface HouseholdViewDb extends ActiveMonthDb {
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
    }): Promise<{ id: string; name: string; color: PersonColor }[]>;
  };
}

/**
 * Reads the household as it stands for one month and hands it to `buildHouseholdView`: the version an
 * opened month is pinned to, otherwise the newest version starting on or before the month. Read-only:
 * it does not open a month.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param requestedMonth - The month key to show, or undefined for the active month.
 * @returns The Household screen.
 * @throws {ApiError} 409 `no_household` before first run; 404 `no_version` for a month before every version.
 */
export async function getHouseholdView(db: HouseholdViewDb, requestedMonth?: string): Promise<HouseholdViewResponse> {
  const activeMonth = await getActiveMonth(db);
  const month = requestedMonth ?? activeMonth;
  const [versions, opened, people] = await Promise.all([
    db.householdVersion.findMany({ orderBy: { startsFromMonth: "desc" }, select: VERSION_SELECT }),
    db.month.findUnique({
      where: { month },
      select: { householdVersion: { select: { schemaVersion: true, config: true } } },
    }),
    db.person.findMany({ select: PERSON_SELECT }),
  ]);
  if (versions.length === 0) throw new ApiError(409, "no_household", "Set up the household first.");

  const version = opened?.householdVersion ?? versions.find((v) => v.startsFromMonth <= month);
  if (!version) throw new ApiError(404, "no_version", "The household has no setup for this month.");

  const nextMonth = addMonths(activeMonth, 1);
  const next = versions.find((v) => v.startsFromMonth <= nextMonth);
  const nextConfig = next ? parseHouseholdConfig(next.schemaVersion, next.config) : null;
  const config = parseHouseholdConfig(version.schemaVersion, version.config);

  return buildHouseholdView({
    month,
    activeMonth,
    editablePersonIds: new Set((nextConfig?.people ?? []).map((p) => p.personId)),
    versionMonths: versions.map((v) => v.startsFromMonth),
    config,
    nextConfig: nextConfig ?? config,
    people,
  });
}
