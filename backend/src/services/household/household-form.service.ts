import {
  addMonths,
  parseHouseholdConfig,
  type HouseholdAddFormResponse,
  type HouseholdConfig,
  type HouseholdFormQuery,
  type HouseholdFormResponse,
  type HouseholdHomeFormResponse,
  type PersonColor,
} from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { buildHomeForm } from "@/lib/household/build-home-form";
import { buildAddPersonForm, buildHouseholdForm } from "@/lib/household/build-household-form";
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

/** Reads next month, the version in effect then, and what the forms need around it. */
async function readNextVersion(db: HouseholdFormDb) {
  const [activeMonth, versions, people] = await Promise.all([
    getActiveMonth(db),
    db.householdVersion.findMany({ orderBy: { startsFromMonth: "desc" }, select: VERSION_SELECT }),
    db.person.findMany({ select: PERSON_SELECT }),
  ]);
  if (versions.length === 0) throw new ApiError(409, "no_household", "Set up the household first.");

  const month = addMonths(activeMonth, 1);
  const version = versions.find((v) => v.startsFromMonth <= month);
  if (!version) throw new ApiError(404, "no_version", "The household has no setup for next month.");
  return { activeMonth, versions, people, month, config: parseHouseholdConfig(version.schemaVersion, version.config) };
}

/** Reads the active month's config: the version it is pinned to once opened, or the one in effect until then. */
async function readActiveConfig(
  db: HouseholdFormDb,
  { activeMonth, versions }: Awaited<ReturnType<typeof readNextVersion>>,
): Promise<HouseholdConfig | null> {
  const opened = await db.month.findUnique({
    where: { month: activeMonth },
    select: { householdVersion: { select: { schemaVersion: true, config: true } } },
  });
  const active = opened?.householdVersion ?? versions.find((v) => v.startsFromMonth <= activeMonth);
  return active ? parseHouseholdConfig(active.schemaVersion, active.config) : null;
}

/**
 * Reads the Add subtenant form: the version in effect next month, which is what a new tenant joins. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The Add subtenant screen.
 * @throws {ApiError} 409 `no_household` before first run; 404 `no_version` when no version covers next month.
 */
export async function getHouseholdAddForm(db: HouseholdFormDb): Promise<HouseholdAddFormResponse> {
  const { month, config, people } = await readNextVersion(db);
  return buildAddPersonForm({ month, config, people });
}

/**
 * Reads the Landlord & rooms form with the latest saved values: the version in effect next month, which is what
 * new edits build on. The active month's version tells whether those values have taken effect yet. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The Landlord & rooms screen.
 * @throws {ApiError} 409 `no_household` before first run; 404 `no_version` when no version covers next month.
 */
export async function getHouseholdHomeForm(db: HouseholdFormDb): Promise<HouseholdHomeFormResponse> {
  const next = await readNextVersion(db);
  const activeConfig = await readActiveConfig(db, next);
  return buildHomeForm({ month: next.month, config: next.config, activeConfig, people: next.people });
}

/**
 * Reads one person's form with their latest saved values: the version in effect next month, which is what
 * new edits build on. The active month's version, the one it is pinned to once opened, tells whether those
 * values have taken effect yet. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param query - The person.
 * @returns The Edit and View screens.
 * @throws {ApiError} 409 `no_household` before first run; 404 `no_version` when no version covers next
 * month; 404 `no_person` for an unknown person or someone not in that version.
 */
export async function getHouseholdForm(db: HouseholdFormDb, query: HouseholdFormQuery): Promise<HouseholdFormResponse> {
  const next = await readNextVersion(db);
  const { month, config, people } = next;
  const known = people.some((p) => p.id === query.personId);
  if (!known || !config.people.some((p) => p.personId === query.personId)) {
    throw new ApiError(404, "no_person", "This person is not in the household next month.");
  }
  const activeConfig = await readActiveConfig(db, next);
  return buildHouseholdForm({ month, config, activeConfig, personId: query.personId, people });
}
