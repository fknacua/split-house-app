import {
  parseHouseholdConfig,
  type HouseholdAddFormResponse,
  type HouseholdConfig,
  type HouseholdFormQuery,
  type HouseholdFormResponse,
  type HouseholdHomeFormResponse,
  type HouseholdSplitFormResponse,
  type PersonColor,
} from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { buildFirstHomeForm, buildHomeForm } from "@/lib/household/build-home-form";
import { buildAddPersonForm, buildHouseholdForm } from "@/lib/household/build-household-form";
import { buildSplitForm } from "@/lib/household/build-split-form";
import { requireStepsBefore } from "@/lib/setup/steps";
import { getEditMonth, type EditMonthDb } from "@/services/setup/edit-month.service";

const VERSION_SELECT = { startsFromMonth: true, schemaVersion: true, config: true } as const;
const PERSON_SELECT = { id: true, name: true, whatsappE164: true, color: true, isOwner: true } as const;

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface HouseholdFormDb extends EditMonthDb {
  month: EditMonthDb["month"] & {
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
 * Reads the month new edits start from, the version they build on, and what the forms need around it: next month's
 * version once a month is open, or in First run the one first version, whatever month it starts in.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The active month, whether First run is on and its done steps, every version, the people, the month edits
 * start from and the config they build on, null when there is none.
 */
export async function readFormContext(db: HouseholdFormDb) {
  const [{ month, activeMonth, firstSetup, doneSteps }, versions, people] = await Promise.all([
    getEditMonth(db),
    db.householdVersion.findMany({ orderBy: { startsFromMonth: "desc" }, select: VERSION_SELECT }),
    db.person.findMany({ select: PERSON_SELECT }),
  ]);
  const version = firstSetup ? versions[0] : versions.find((v) => v.startsFromMonth <= month);
  const config = version ? parseHouseholdConfig(version.schemaVersion, version.config) : null;
  return { activeMonth, firstSetup, doneSteps, versions, people, month, config };
}

/**
 * Reads what `readFormContext` does, for a form that needs a version to build on.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The same, with the config.
 * @throws {ApiError} 409 `rooms_first` in First run before Rent & rooms is saved; 404 `no_version` when no version
 * covers next month.
 */
export async function readNextVersion(db: HouseholdFormDb) {
  return requireConfig(await readFormContext(db));
}

/**
 * Narrows a form context to one with a config.
 *
 * @param context - What `readFormContext` returned.
 * @returns The same, with the config.
 * @throws {ApiError} As `readNextVersion`.
 */
export function requireConfig(context: Awaited<ReturnType<typeof readFormContext>>) {
  const { config } = context;
  if (config) return { ...context, config };
  if (context.firstSetup) throw new ApiError(409, "rooms_first", "Save Rent & rooms first.");
  throw new ApiError(404, "no_version", "The household has no setup for next month.");
}

/**
 * Reads the active month's config: the version it is pinned to once opened, or the one in effect until then. In
 * First run nothing has taken effect yet, so it is the first version's own config and nothing shows as pending.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param next - What `readNextVersion` returned.
 * @returns The config, or null when no version covers the active month.
 */
export async function readActiveConfig(
  db: HouseholdFormDb,
  { activeMonth, versions, firstSetup, config }: Awaited<ReturnType<typeof readNextVersion>>,
): Promise<HouseholdConfig | null> {
  if (firstSetup) return config;
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
 * @throws {ApiError} The same as `readNextVersion`.
 */
export async function getHouseholdAddForm(db: HouseholdFormDb): Promise<HouseholdAddFormResponse> {
  const { month, config, people } = await readNextVersion(db);
  return buildAddPersonForm({ month, config, people });
}

/**
 * Reads the Landlord & rooms form with the latest saved values: the version in effect next month, which is what
 * new edits build on. The active month's version tells whether those values have taken effect yet. In First run
 * before any version exists, the form is blank, with the master room to add. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The Landlord & rooms screen.
 * @throws {ApiError} 409 `start_month_first` in First run before Start month is saved; 404 `no_version` when no
 * version covers next month.
 */
export async function getHouseholdHomeForm(db: HouseholdFormDb): Promise<HouseholdHomeFormResponse> {
  const context = await readFormContext(db);
  if (context.firstSetup) requireStepsBefore("rentAndRooms", context.doneSteps);
  if (!context.config && context.firstSetup) return buildFirstHomeForm(context.month);
  const next = requireConfig(context);
  const activeConfig = await readActiveConfig(db, next);
  return buildHomeForm({ month: next.month, config: next.config, activeConfig, people: next.people });
}

/**
 * Reads the Household split form with the latest saved values: the version in effect next month, which is what new
 * edits build on. The active month's version tells whether those values have taken effect yet. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The Household split screen.
 * @throws {ApiError} The same as `readNextVersion`; 409 `people_first` in First run before People is done.
 */
export async function getHouseholdSplitForm(db: HouseholdFormDb): Promise<HouseholdSplitFormResponse> {
  const next = await readNextVersion(db);
  if (next.firstSetup) requireStepsBefore("householdSplits", next.doneSteps);
  const activeConfig = await readActiveConfig(db, next);
  return buildSplitForm({ month: next.month, config: next.config, activeConfig, people: next.people });
}

/**
 * Reads one person's form with their latest saved values: the version in effect next month, which is what
 * new edits build on. The active month's version, the one it is pinned to once opened, tells whether those
 * values have taken effect yet. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param query - The person.
 * @returns The Edit and View screens.
 * @throws {ApiError} The same as `readNextVersion`; 404 `no_person` for an unknown person or someone not in
 * that version.
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
