import {
  parseHouseholdConfig,
  todayKey,
  type AddChargePreview,
  type AddChargeQuery,
  type AddChargeSheet,
  type AddChargeValues,
} from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";
import { buildAddChargePreview, buildAddChargeSheet, type AddChargeInput, type AddChargePerson } from "@/lib/add-charge/build-add-charge";
import {
  buildCorrectionPreview,
  correctionChargeProblem,
  findCorrectable,
  type CorrectableCharge,
  type CorrectionInput,
} from "@/lib/add-charge/build-correction";
import { CORRECTABLE_CATEGORIES } from "@/lib/corrections/correction-fields";
import { ApiError } from "@/lib/api";
import { now } from "@/lib/now";

const MONTH_SELECT = { month: true, householdVersion: { select: { schemaVersion: true, config: true } } } as const;
const PERSON_SELECT = { id: true, name: true, color: true } as const;

/** What Correction mode reads of a charge, with the amounts of the corrections linked to it. */
export const CORRECTABLE_SELECT = {
  id: true,
  month: true,
  personId: true,
  category: true,
  label: true,
  amountCents: true,
  payViaPersonId: true,
  paidCents: true,
  paidByPersonId: true,
  corrections: { select: { amountCents: true } },
} as const;

/** A charge as {@link CORRECTABLE_SELECT} reads it. */
export interface CorrectableChargeRow {
  id: string;
  month: string;
  personId: string;
  category: ChargeCategory;
  label: string;
  amountCents: number;
  payViaPersonId: string | null;
  paidCents: number | null;
  paidByPersonId: string | null;
  corrections: { amountCents: number }[];
}

/** Which charges the Selects read: paid utilities, aircon and one-off charges of anyone but the owner, or one by id. */
export type CorrectableWhere =
  | { category: { in: ChargeCategory[] }; paidCents: { not: null }; person: { isOwner: false } }
  | { id: string };

/** The slice of the Prisma client, or of a transaction, that reads charges for Correction mode. */
export interface CorrectableChargeDb {
  charge: {
    findMany(args: { where: CorrectableWhere; select: typeof CORRECTABLE_SELECT }): Promise<CorrectableChargeRow[]>;
  };
}

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface AddChargeDb extends CorrectableChargeDb {
  month: {
    findFirst(args: { orderBy: { month: "desc" }; select: typeof MONTH_SELECT }): Promise<{
      month: string;
      householdVersion: { schemaVersion: number; config: unknown };
    } | null>;
  };
  person: {
    findMany(args: { select: typeof PERSON_SELECT }): Promise<AddChargePerson[]>;
  };
}

/**
 * Reads charges for Correction mode, each with the amounts of the corrections linked to it.
 *
 * @param db - The Prisma client or a transaction, or a fake in tests.
 * @param chargeId - One charge by id (whether or not it can be corrected), or, when left out, every paid utilities,
 * aircon and one-off charge of anyone but the owner.
 * @returns The charges.
 */
export async function readCorrectableCharges(db: CorrectableChargeDb, chargeId?: string): Promise<CorrectableCharge[]> {
  const where: CorrectableWhere =
    chargeId === undefined
      ? { category: { in: [...CORRECTABLE_CATEGORIES] }, paidCents: { not: null }, person: { isOwner: false } }
      : { id: chargeId };
  const rows = await db.charge.findMany({ where, select: CORRECTABLE_SELECT });
  return rows.map(({ corrections, ...charge }) => ({ ...charge, correctionCents: corrections.map((c) => c.amountCents) }));
}

/**
 * Reads the newest opened month, where an Add charge charge or a correction lands, with its pinned config and
 * everyone's name and color. Read-only: it opens nothing.
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
 * The Add charge sheet as it opens, for the newest opened month, with Correction mode's Selects. Opened from a charge
 * (`chargeId`), it is `Add correction` with that charge picked.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param query - The charge `Add correction` was tapped on, if any.
 * @returns The sheet.
 * @throws {ApiError} 404 `no_month` while no month has opened; for `chargeId`, 404 `no_charge`, 409 `is_correction`,
 * `owner_charge`, `not_correctable` or `unpaid`, or 404 `no_person` when it can't be corrected here.
 */
export async function getAddChargeSheet(db: AddChargeDb, query: AddChargeQuery = {}): Promise<AddChargeSheet> {
  const [base, charges] = await Promise.all([loadInput(db), readCorrectableCharges(db)]);
  const input: CorrectionInput = { ...base, today: todayKey(now()), charges };
  if (query.chargeId === undefined) return buildAddChargeSheet(input);

  const [from = null] = await readCorrectableCharges(db, query.chargeId);
  const problem = correctionChargeProblem(input, from);
  if (problem) throw new ApiError(problem.status, problem.code, problem.message);
  return buildAddChargeSheet(input, findCorrectable(input, query.chargeId));
}

/**
 * The sheet's preview for the fields as they stand, in either mode. Nothing is stored.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param values - The fields as they stand.
 * @returns The preview.
 * @throws {ApiError} 404 `no_month` while no month has opened.
 */
export async function previewAddCharge(db: AddChargeDb, values: AddChargeValues): Promise<AddChargePreview> {
  const input = await loadInput(db);
  if (values.mode === "CHARGE") return buildAddChargePreview(input, values);
  const { chargeId } = values.correction;
  const charges = chargeId === null ? [] : await readCorrectableCharges(db, chargeId);
  return buildCorrectionPreview({ ...input, today: todayKey(now()), charges }, values.correction);
}
