import { randomUUID } from "node:crypto";
import {
  HOUSEHOLD_SCHEMA_VERSION,
  parseHouseholdConfig,
  type HouseholdAddPersonEdit,
  type HouseholdConfig,
  type HouseholdEdit,
  type HouseholdEditPreviewResponse,
  type HouseholdEditSaveResponse,
  type HouseholdHomeEdit,
  type HouseholdPersonEdit,
  type HouseholdRecurringEdit,
  type HouseholdRemovePersonEdit,
  type HouseholdRemoveRecurringEdit,
  type HouseholdSplitEdit,
  type PersonColor,
} from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { emptyHouseholdConfig, firstSetupGroups } from "@/lib/household/first-setup";
import { planAddPerson } from "@/lib/household/plan-add-person";
import { planHouseholdEdit, versionInEffect, type HouseholdEditPlan, type ParsedVersion } from "@/lib/household/plan-edit";
import { planHomeEdit } from "@/lib/household/plan-home-edit";
import { planRecurringEdit, planRemoveRecurring, runningCharges } from "@/lib/household/plan-recurring-edit";
import { planRemovePerson } from "@/lib/household/plan-remove-person";
import { planSplitEdit } from "@/lib/household/plan-split-edit";
import { requireStepsBefore } from "@/lib/setup/steps";
import { getEditMonth, type EditMonthDb } from "@/services/setup/edit-month.service";
import { markStepsDone, type SetupWriteDb } from "@/services/setup/setup-record.service";

const VERSION_SELECT = { id: true, startsFromMonth: true, schemaVersion: true, config: true } as const;
const PERSON_SELECT = { id: true, name: true, whatsappE164: true, color: true, isOwner: true } as const;
/** A month after every version, to find the newest. */
const LAST_MONTH = "9999-12";

/** The reads an edit needs, so tests can pass an in-memory fake. */
export interface HouseholdEditReadDb extends EditMonthDb {
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
  setup: SetupWriteDb["setup"];
  householdVersion: HouseholdEditReadDb["householdVersion"] & {
    updateMany(args: {
      where: { id: string; months: { none: object } };
      data: { startsFromMonth: string; schemaVersion: number; config: HouseholdConfig };
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
      data: { id: string; name: string; whatsappE164: string | null; color: PersonColor; isOwner: boolean };
    }): Promise<unknown>;
    delete(args: { where: { id: string } }): Promise<unknown>;
  };
}

/** The Prisma client, or a fake in tests. */
export interface HouseholdEditDb extends HouseholdEditReadDb {
  $transaction<T>(fn: (tx: HouseholdEditTx) => Promise<T>): Promise<T>;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

/**
 * Reads what any edit depends on: the month it starts from, the version it builds on and the row a save would
 * update. Once a month is open, that is next month's version. In First run it is the one first version, whatever
 * month it starts in, since a save moves it to the start month; before Rent & rooms is saved there is none.
 */
async function readContext(db: HouseholdEditReadDb) {
  const [{ month, firstSetup, doneSteps }, rows, people] = await Promise.all([
    getEditMonth(db),
    db.householdVersion.findMany({ select: VERSION_SELECT }),
    db.person.findMany({ select: PERSON_SELECT }),
  ]);
  const versions = rows.map((row) => ({
    startsFromMonth: row.startsFromMonth,
    config: parseHouseholdConfig(row.schemaVersion, row.config),
  }));
  // First run has one version; the newest is it.
  const base: ParsedVersion | null = versionInEffect(versions, firstSetup ? LAST_MONTH : month);
  const existing = rows.find((row) => row.startsFromMonth === (firstSetup ? base?.startsFromMonth : month)) ?? null;
  return { month, firstSetup, doneSteps, base, people, existing };
}

/**
 * Refuses an edit with no version to build on.
 *
 * @throws {ApiError} 409 `rooms_first` in First run before Rent & rooms is saved; 404 `no_version` when no version
 * covers next month.
 */
function noBase(firstSetup: boolean): never {
  if (firstSetup) throw new ApiError(409, "rooms_first", "Save Rent & rooms first.");
  throw new ApiError(404, "no_version", "The household has no setup for next month.");
}

/** Reads what an edit to an existing household depends on, refusing it as `noBase` does when there is none. */
async function loadContext(db: HouseholdEditReadDb) {
  const context = await readContext(db);
  if (!context.base) noBase(context.firstSetup);
  return { ...context, base: context.base };
}

/** Plans an edit to someone in next month's version. */
async function loadPlan(db: HouseholdEditReadDb, edit: HouseholdPersonEdit) {
  const { month, firstSetup, base, people, existing } = await loadContext(db);
  const person = people.find((p) => p.id === edit.personId);
  if (!person || !base.config.people.some((p) => p.personId === edit.personId)) {
    throw new ApiError(404, "no_person", "This person is not in the household next month.");
  }
  return {
    month,
    firstSetup,
    existing,
    plan: planHouseholdEdit({ edit, person, names: new Map(people.map((p) => [p.id, p.name])), month, base }),
  };
}

/** Plans removing someone in next month's version. */
async function loadRemovePlan(db: HouseholdEditReadDb, edit: HouseholdRemovePersonEdit) {
  const { month, firstSetup, base, existing } = await loadContext(db);
  if (!base.config.people.some((p) => p.personId === edit.personId)) {
    throw new ApiError(404, "no_person", "This person is not in the household next month.");
  }
  return {
    month,
    firstSetup,
    existing,
    plan: planRemovePerson(edit.personId, base.config, { firstSetup }),
  };
}

/**
 * Plans a Landlord & rooms edit to next month's version, with new ids for any rooms it adds. The first save, before
 * any version exists, starts from the owner alone, using their `Person` row's id when there is one.
 */
async function loadHomePlan(db: HouseholdEditReadDb, edit: HouseholdHomeEdit) {
  const context = await readContext(db);
  if (!context.base && !context.firstSetup) noBase(false);
  if (context.firstSetup) requireStepsBefore("rentAndRooms", context.doneSteps);
  const newRoomIds = edit.newRooms.map(() => randomUUID());
  const ownerId = context.people.find((p) => p.isOwner)?.id ?? randomUUID();
  const masterIndex = edit.newRooms.findIndex((room) => room.roomType === "MASTER");
  const isFirst = context.base === null;
  const base = context.base ?? {
    startsFromMonth: context.month,
    config: emptyHouseholdConfig(ownerId, newRoomIds[masterIndex] ?? ""),
  };
  return {
    ...context,
    isFirst,
    ownerId,
    plan: planHomeEdit({
      edit,
      names: new Map(context.people.map((p) => [p.id, p.name])),
      month: context.month,
      base,
      newRoomIds,
      isFirst,
    }),
  };
}

/** Plans a Household split edit to next month's version. In First run, People must be done first. */
async function loadSplitPlan(db: HouseholdEditReadDb, edit: HouseholdSplitEdit) {
  const { month, firstSetup, doneSteps, base, people, existing } = await loadContext(db);
  if (firstSetup) requireStepsBefore("householdSplits", doneSteps);
  return {
    month,
    firstSetup,
    existing,
    plan: planSplitEdit({ edit, names: new Map(people.map((p) => [p.id, p.name])), month, base }),
  };
}

/** Refuses a charge that is not running next month, which the sheet can't have open unless it just changed. */
function requireRunningCharge(config: HouseholdConfig, month: string, chargeId: string): void {
  if (!runningCharges(config, month).some((charge) => charge.id === chargeId)) {
    throw new ApiError(404, "no_charge", "This charge is not in the household next month.");
  }
}

/** Plans adding or changing a recurring charge in next month's version. */
async function loadRecurringPlan(db: HouseholdEditReadDb, edit: HouseholdRecurringEdit) {
  const { month, base, people, existing } = await loadContext(db);
  if (edit.chargeId !== null) requireRunningCharge(base.config, month, edit.chargeId);
  return {
    month,
    existing,
    plan: planRecurringEdit({
      edit,
      names: new Map(people.map((p) => [p.id, p.name])),
      month,
      base,
      newChargeId: randomUUID(),
    }),
  };
}

/** Plans stopping a recurring charge in next month's version. */
async function loadRemoveRecurringPlan(db: HouseholdEditReadDb, edit: HouseholdRemoveRecurringEdit) {
  const { month, base, existing } = await loadContext(db);
  requireRunningCharge(base.config, month, edit.chargeId);
  return { month, existing, plan: planRemoveRecurring(base.config, edit.chargeId) };
}

/**
 * Stores a dated save: updates the version it builds on while no month has opened using it, starting it from
 * `month` (which moves First run's version to the start month), or creates one.
 */
async function storeVersion(
  tx: HouseholdEditTx,
  month: string,
  existing: { id: string } | null,
  config: HouseholdConfig,
): Promise<void> {
  const data = { startsFromMonth: month, schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config };
  if (existing) {
    const { count } = await tx.householdVersion.updateMany({
      where: { id: existing.id, months: { none: {} } },
      data,
    });
    if (count === 0) throw new ApiError(409, "version_locked", "A month has already opened using this version.");
  } else {
    await tx.householdVersion.create({ data });
  }
}

/** Checks and stores a new person: the `Person` row and next month's version, inside the caller's transaction. */
async function saveAddPerson(tx: HouseholdEditTx, edit: HouseholdAddPersonEdit): Promise<HouseholdEditSaveResponse> {
  const { month, firstSetup, base, existing } = await loadContext(tx);
  const id = randomUUID();
  const { name, nextConfig, errors } = planAddPerson(edit, id, base.config, { firstSetup });
  const messages = Object.values(errors);
  if (messages.length > 0) throw new ApiError(422, "invalid_edit", messages.join(" "));
  if (!nextConfig || name === null) throw new ApiError(422, "invalid_edit", "Fill in the required fields.");

  await tx.person.create({ data: { id, name, whatsappE164: edit.whatsappE164, color: edit.color, isOwner: false } });
  await storeVersion(tx, month, existing, nextConfig);
  return { savedFromMonth: month };
}

/**
 * Checks and stores a removal: next month's version without them. Their `Person` row stays for past months, except
 * in First run, where nothing refers to it yet, so it is deleted.
 */
async function saveRemovePerson(tx: HouseholdEditTx, edit: HouseholdRemovePersonEdit): Promise<HouseholdEditSaveResponse> {
  const { plan, month, firstSetup, existing } = await loadRemovePlan(tx, edit);
  if (!plan.nextConfig) throw new ApiError(422, "invalid_edit", Object.values(plan.errors).join(" "));
  await storeVersion(tx, month, existing, plan.nextConfig);
  if (firstSetup) await tx.person.delete({ where: { id: edit.personId } });
  return { savedFromMonth: month };
}

/** Checks and stores a plan that only changes next month's version, inside the caller's transaction. */
async function saveVersionPlan(
  tx: HouseholdEditTx,
  { plan, month, existing }: {
    plan: { nextConfig: HouseholdConfig | null; errors: Record<string, string> };
    month: string;
    existing: { id: string } | null;
  },
): Promise<HouseholdEditSaveResponse> {
  const messages = Object.values(plan.errors);
  if (messages.length > 0) throw new ApiError(422, "invalid_edit", messages.join(" "));
  if (!plan.nextConfig) throw new ApiError(422, "no_changes", "There is nothing to save.");
  await storeVersion(tx, month, existing, plan.nextConfig);
  return { savedFromMonth: month };
}

/**
 * Checks and stores a Landlord & rooms edit. The first one, before any version exists, also creates the owner's
 * `Person` row when there is none, named from the session and colored Teal, and the first version.
 */
async function saveHomeEdit(tx: HouseholdEditTx, edit: HouseholdHomeEdit, ownerName: string | undefined): Promise<HouseholdEditSaveResponse> {
  const loaded = await loadHomePlan(tx, edit);
  if (!loaded.isFirst) {
    const saved = await saveVersionPlan(tx, loaded);
    if (loaded.firstSetup) await markStepsDone(tx, ["rentAndRooms"]);
    return saved;
  }

  const { plan, month, ownerId, people } = loaded;
  const messages = Object.values(plan.errors);
  if (messages.length > 0) throw new ApiError(422, "invalid_edit", messages.join(" "));
  if (!plan.nextConfig) throw new ApiError(422, "invalid_edit", "Fill in the required fields.");
  if (!people.some((p) => p.id === ownerId)) {
    if (ownerName === undefined) throw new Error("The first save needs the owner's name");
    await tx.person.create({ data: { id: ownerId, name: ownerName, whatsappE164: null, color: "TEAL", isOwner: true } });
  }
  await storeVersion(tx, month, null, plan.nextConfig);
  await markStepsDone(tx, ["rentAndRooms"]);
  return { savedFromMonth: month };
}

/** Checks and stores a Household split edit. In First run it also marks Household splits done. */
async function saveSplitEdit(tx: HouseholdEditTx, edit: HouseholdSplitEdit): Promise<HouseholdEditSaveResponse> {
  const loaded = await loadSplitPlan(tx, edit);
  const saved = await saveVersionPlan(tx, loaded);
  if (loaded.firstSetup) await markStepsDone(tx, ["householdSplits"]);
  return saved;
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
 * In First run (no month open) edits build on the first version and start from the start month; a Landlord & rooms
 * edit before any version exists builds the first one.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param edit - The edit.
 * @returns The summary groups, whether Save is allowed and the errors per field.
 * @throws {ApiError} 409 `rooms_first` for any edit but Landlord & rooms in First run before Rent & rooms is saved;
 * in First run, 409 `start_month_first` for Landlord & rooms before Start month is saved and `people_first` for a
 * Household split before People is done; 404 `no_version` when no version covers next month; 404 `no_person` for an unknown person or someone not in the
 * version; 404 `no_charge` for a recurring charge not running next month.
 */
export async function previewHouseholdEdit(db: HouseholdEditReadDb, edit: HouseholdEdit): Promise<HouseholdEditPreviewResponse> {
  if (edit.kind === "addPerson") {
    const { base, firstSetup } = await loadContext(db);
    const { canSave, errors } = planAddPerson(edit, randomUUID(), base.config, { firstSetup });
    return { groups: [], canSave, errors };
  }
  if (edit.kind === "removePerson") {
    const { plan } = await loadRemovePlan(db, edit);
    return { groups: [], canSave: plan.canSave, errors: plan.errors };
  }
  if (edit.kind === "home") {
    const { firstSetup, plan } = await loadHomePlan(db, edit);
    return {
      groups: firstSetupGroups(plan.groups, firstSetup),
      canSave: plan.canSave,
      errors: plan.errors,
      warnings: plan.warnings,
      masterRent: plan.masterRent,
    };
  }
  if (edit.kind === "split") {
    const { firstSetup, plan } = await loadSplitPlan(db, edit);
    return {
      groups: firstSetupGroups(plan.groups, firstSetup),
      canSave: plan.canSave,
      errors: plan.errors,
      warnings: plan.warnings,
      amounts: plan.amounts,
    };
  }
  if (edit.kind === "recurring") {
    const { plan } = await loadRecurringPlan(db, edit);
    return { groups: plan.groups, canSave: plan.canSave, errors: plan.errors };
  }
  if (edit.kind === "removeRecurring") {
    const { plan } = await loadRemoveRecurringPlan(db, edit);
    return { groups: [], canSave: plan.canSave, errors: plan.errors };
  }
  const { firstSetup, plan } = await loadPlan(db, edit);
  return {
    groups: firstSetupGroups(plan.groups, firstSetup),
    canSave: plan.canSave,
    errors: plan.errors,
  };
}

/**
 * Saves an edit in one transaction, running the preview's checks again. Name, WhatsApp and color go on
 * the `Person` row; dated values start next month, updating the version starting then while no month has
 * opened using it, or creating one from the version in effect. An edit that changes only the row stores no
 * version. Adding a person creates their row and adds them to that version; removing one takes them out of it.
 * A Landlord & rooms, Household split or recurring charge edit changes only that version.
 *
 * In First run every edit updates the one first version and starts it from the start month. The first Landlord &
 * rooms save creates it, with the master room and the owner's `Person` row; removing someone deletes their row. A
 * Landlord & rooms or Household split save marks its step done.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param edit - The edit.
 * @param ownerName - The signed-in user's name, for the owner's `Person` row the first Landlord & rooms save creates.
 * @returns The month the dated values start from, or null when there were none.
 * @throws {ApiError} The preview's 404s and 409s; 409 `version_locked` when a month has opened using the version; 409
 * `version_conflict` when a second save created the same month first; 422 `invalid_edit` when a rule
 * fails or a required field is empty; 422 `no_changes` when there is nothing to store.
 */
export async function saveHouseholdEdit(db: HouseholdEditDb, edit: HouseholdEdit, ownerName?: string): Promise<HouseholdEditSaveResponse> {
  try {
    return await db.$transaction(async (tx) => {
      if (edit.kind === "addPerson") return saveAddPerson(tx, edit);
      if (edit.kind === "removePerson") return saveRemovePerson(tx, edit);
      if (edit.kind === "home") return saveHomeEdit(tx, edit, ownerName);
      if (edit.kind === "split") return saveSplitEdit(tx, edit);
      if (edit.kind === "recurring") return saveVersionPlan(tx, await loadRecurringPlan(tx, edit));
      if (edit.kind === "removeRecurring") return saveVersionPlan(tx, await loadRemoveRecurringPlan(tx, edit));
      return savePersonEdit(tx, edit);
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, "version_conflict", "This month was just changed. Try again.");
    }
    throw err;
  }
}
