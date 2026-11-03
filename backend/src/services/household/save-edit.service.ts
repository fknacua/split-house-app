import { randomUUID } from "node:crypto";
import {
  addMonths,
  HOUSEHOLD_SCHEMA_VERSION,
  parseHouseholdConfig,
  type HouseholdAddPersonEdit,
  type HouseholdConfig,
  type HouseholdEdit,
  type HouseholdEditPreviewResponse,
  type HouseholdEditSaveResponse,
  type HouseholdPersonEdit,
  type PersonColor,
} from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { planAddPerson } from "@/lib/household/plan-add-person";
import { planHouseholdEdit, versionInEffect, type HouseholdEditPlan } from "@/lib/household/plan-edit";
import { getActiveMonth, type ActiveMonthDb } from "@/services/months/active-month.service";

const VERSION_SELECT = { id: true, startsFromMonth: true, schemaVersion: true, config: true } as const;
const PERSON_SELECT = { id: true, name: true, whatsappE164: true, color: true, isOwner: true } as const;

/** The reads an edit needs, so tests can pass an in-memory fake. */
export interface HouseholdEditReadDb extends ActiveMonthDb {
  householdVersion: {
    findMany(args: {
      select: typeof VERSION_SELECT;
    }): Promise<{ id: string; startsFromMonth: string; schemaVersion: number; config: unknown }[]>;
  };
  person: {
    findMany(args: {
      select: typeof PERSON_SELECT;
    }): Promise<{ id: string; name: string; whatsappE164: string | null; color: PersonColor; isOwner: boolean }[]>;
  };
}

/** The slice of a Prisma transaction client saving an edit uses. */
export interface HouseholdEditTx extends HouseholdEditReadDb {
  householdVersion: HouseholdEditReadDb["householdVersion"] & {
    updateMany(args: {
      where: { id: string; months: { none: object } };
      data: { schemaVersion: number; config: HouseholdConfig };
    }): Promise<{ count: number }>;
    create(args: {
      data: { startsFromMonth: string; schemaVersion: number; config: HouseholdConfig };
    }): Promise<unknown>;
  };
  person: HouseholdEditReadDb["person"] & {
    update(args: {
      where: { id: string };
      data: HouseholdEditPlan["personChanges"];
    }): Promise<unknown>;
    create(args: {
      data: { id: string; name: string; whatsappE164: string | null; color: PersonColor; isOwner: false };
    }): Promise<unknown>;
  };
}

/** The Prisma client, or a fake in tests. */
export interface HouseholdEditDb extends HouseholdEditReadDb {
  $transaction<T>(fn: (tx: HouseholdEditTx) => Promise<T>): Promise<T>;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

/** Reads what any edit depends on: next month, the version in effect then, and the row a dated save would update. */
async function loadContext(db: HouseholdEditReadDb) {
  const [activeMonth, rows, people] = await Promise.all([
    getActiveMonth(db),
    db.householdVersion.findMany({ select: VERSION_SELECT }),
    db.person.findMany({ select: PERSON_SELECT }),
  ]);
  if (rows.length === 0) throw new ApiError(409, "no_household", "Set up the household first.");

  const versions = rows.map((row) => ({
    startsFromMonth: row.startsFromMonth,
    config: parseHouseholdConfig(row.schemaVersion, row.config),
  }));
  const month = addMonths(activeMonth, 1);
  const base = versionInEffect(versions, month);
  if (!base) throw new ApiError(404, "no_version", "The household has no setup for next month.");
  return { month, base, people, existing: rows.find((row) => row.startsFromMonth === month) ?? null };
}

/** Plans an edit to someone in next month's version. */
async function loadPlan(db: HouseholdEditReadDb, edit: HouseholdPersonEdit) {
  const { month, base, people, existing } = await loadContext(db);
  const person = people.find((p) => p.id === edit.personId);
  if (!person || !base.config.people.some((p) => p.personId === edit.personId)) {
    throw new ApiError(404, "no_person", "This person is not in the household next month.");
  }
  return {
    month,
    existing,
    plan: planHouseholdEdit({ edit, person, names: new Map(people.map((p) => [p.id, p.name])), month, base }),
  };
}

/** Stores a dated save: updates the version starting next month while no month has opened using it, or creates it. */
async function storeVersion(
  tx: HouseholdEditTx,
  month: string,
  existing: { id: string } | null,
  config: HouseholdConfig,
): Promise<void> {
  const data = { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config };
  if (existing) {
    const { count } = await tx.householdVersion.updateMany({
      where: { id: existing.id, months: { none: {} } },
      data,
    });
    if (count === 0) throw new ApiError(409, "version_locked", "A month has already opened using this version.");
  } else {
    await tx.householdVersion.create({ data: { startsFromMonth: month, ...data } });
  }
}

/** Checks and stores a new tenant: the `Person` row and next month's version, inside the caller's transaction. */
async function saveAddPerson(tx: HouseholdEditTx, edit: HouseholdAddPersonEdit): Promise<HouseholdEditSaveResponse> {
  const { month, base, existing } = await loadContext(tx);
  const id = randomUUID();
  const { name, nextConfig, errors } = planAddPerson(edit, id, base.config);
  const messages = Object.values(errors);
  if (messages.length > 0) throw new ApiError(422, "invalid_edit", messages.join(" "));
  if (!nextConfig || name === null) throw new ApiError(422, "invalid_edit", "Fill in the required fields.");

  await tx.person.create({ data: { id, name, whatsappE164: edit.whatsappE164, color: edit.color, isOwner: false } });
  await storeVersion(tx, month, existing, nextConfig);
  return { savedFromMonth: month };
}

/** Checks and stores an edit to someone, inside the caller's transaction. */
async function savePersonEdit(tx: HouseholdEditTx, edit: HouseholdPersonEdit): Promise<HouseholdEditSaveResponse> {
  const { plan, month, existing } = await loadPlan(tx, edit);
  const messages = Object.values(plan.errors);
  if (messages.length > 0) throw new ApiError(422, "invalid_edit", messages.join(" "));
  if (!plan.canSave) throw new ApiError(422, "no_changes", "There is nothing to save.");

  if (Object.keys(plan.personChanges).length > 0) {
    await tx.person.update({ where: { id: edit.personId }, data: plan.personChanges });
  }
  if (!plan.nextConfig) return { savedFromMonth: null };

  await storeVersion(tx, month, existing, plan.nextConfig);
  return { savedFromMonth: month };
}

/**
 * Works out what an edit would change. Nothing is stored. Rule failures come back in `errors`, so the
 * form can show them as they are typed. Adding a person has no summary, since the form is the summary.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param edit - The edit.
 * @returns The summary groups, whether Save is allowed and the errors per field.
 * @throws {ApiError} 409 `no_household` before first run; 404 `no_version` when no version covers next
 * month; 404 `no_person` for an unknown person or someone not in the version.
 */
export async function previewHouseholdEdit(db: HouseholdEditReadDb, edit: HouseholdEdit): Promise<HouseholdEditPreviewResponse> {
  if (edit.kind === "addPerson") {
    const { base } = await loadContext(db);
    const { canSave, errors } = planAddPerson(edit, randomUUID(), base.config);
    return { groups: [], canSave, errors };
  }
  const { plan } = await loadPlan(db, edit);
  return {
    groups: plan.groups,
    canSave: plan.canSave,
    errors: plan.errors,
  };
}

/**
 * Saves an edit in one transaction, running the preview's checks again. Name, WhatsApp and color go on
 * the `Person` row; dated values start next month, updating the version starting then while no month has
 * opened using it, or creating one from the version in effect. An edit that changes only the row stores no
 * version. Adding a person creates their row and adds them to that version.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param edit - The edit.
 * @returns The month the dated values start from, or null when there were none.
 * @throws {ApiError} The preview's 404s and 409 `no_household`; 409 `version_locked` when a month has opened using the version; 409
 * `version_conflict` when a second save created the same month first; 422 `invalid_edit` when a rule
 * fails or a new person's required field is empty; 422 `no_changes` when there is nothing to store.
 */
export async function saveHouseholdEdit(db: HouseholdEditDb, edit: HouseholdEdit): Promise<HouseholdEditSaveResponse> {
  try {
    return await db.$transaction((tx) => (edit.kind === "addPerson" ? saveAddPerson(tx, edit) : savePersonEdit(tx, edit)));
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, "version_conflict", "This month was just changed. Try again.");
    }
    throw err;
  }
}
