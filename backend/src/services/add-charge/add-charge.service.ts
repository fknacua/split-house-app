import { parseHouseholdConfig, type AddChargePreview, type AddChargeSheet, type AddChargeValues } from "@splithouse/shared";
import { buildAddChargePreview, buildAddChargeSheet, type AddChargeInput, type AddChargePerson } from "@/lib/add-charge/build-add-charge";
import { ApiError } from "@/lib/api";

const MONTH_SELECT = { month: true, householdVersion: { select: { schemaVersion: true, config: true } } } as const;
const PERSON_SELECT = { id: true, name: true, color: true } as const;

/** The newest opened month with its pinned version, as this service reads it. */
interface NewestMonthRow {
  month: string;
  householdVersion: { schemaVersion: number; config: unknown };
}

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface AddChargeDb {
  month: {
    findFirst(args: { orderBy: { month: "desc" }; select: typeof MONTH_SELECT }): Promise<NewestMonthRow | null>;
  };
  person: {
    findMany(args: { select: typeof PERSON_SELECT }): Promise<AddChargePerson[]>;
  };
}

/**
 * Reads the newest opened month, where an Add charge charge lands, with its pinned config and everyone's name and
 * color. Read-only: it opens nothing.
 *
 * @throws {ApiError} 404 `no_month` while no month has opened.
 */
async function loadInput(db: AddChargeDb): Promise<AddChargeInput> {
  const [newest, people] = await Promise.all([
    db.month.findFirst({ orderBy: { month: "desc" }, select: MONTH_SELECT }),
    db.person.findMany({ select: PERSON_SELECT }),
  ]);
  if (!newest) throw new ApiError(404, "no_month", "No month is open yet.");
  const { schemaVersion, config } = newest.householdVersion;
  return { month: newest.month, config: parseHouseholdConfig(schemaVersion, config), people };
}

/**
 * The Add charge sheet as it opens, for the newest opened month.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The sheet.
 * @throws {ApiError} 404 `no_month` while no month has opened.
 */
export async function getAddChargeSheet(db: AddChargeDb): Promise<AddChargeSheet> {
  return buildAddChargeSheet(await loadInput(db));
}

/**
 * The sheet's preview for the fields as they stand. Nothing is stored.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param values - The fields as they stand.
 * @returns The preview.
 * @throws {ApiError} 404 `no_month` while no month has opened.
 */
export async function previewAddCharge(db: AddChargeDb, values: AddChargeValues): Promise<AddChargePreview> {
  return buildAddChargePreview(await loadInput(db), values);
}
