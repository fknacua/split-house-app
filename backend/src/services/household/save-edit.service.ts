import {
  formatMonthLabel,
  HOUSEHOLD_SCHEMA_VERSION,
  parseHouseholdConfig,
  type HouseholdConfig,
  type HouseholdEdit,
  type HouseholdEditPreviewResponse,
  type HouseholdEditSaveResponse,
  type PersonColor,
} from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { planHouseholdEdit, versionsAround, type HouseholdEditPlan } from "@/lib/household/plan-edit";
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
    findUnique(args: {
      where: { id: string };
      select: typeof PERSON_SELECT;
    }): Promise<{ id: string; name: string; whatsappE164: string | null; color: PersonColor; isOwner: boolean } | null>;
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
  };
}

/** The Prisma client, or a fake in tests. */
export interface HouseholdEditDb extends HouseholdEditReadDb {
  $transaction<T>(fn: (tx: HouseholdEditTx) => Promise<T>): Promise<T>;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

/** Reads what the edit depends on and plans it. Also returns the row a dated save would update. */
async function loadPlan(db: HouseholdEditReadDb, edit: HouseholdEdit) {
  const [activeMonth, rows, person] = await Promise.all([
    getActiveMonth(db),
    db.householdVersion.findMany({ select: VERSION_SELECT }),
    db.person.findUnique({ where: { id: edit.personId }, select: PERSON_SELECT }),
  ]);
  if (rows.length === 0) throw new ApiError(409, "no_household", "Set up the household first.");

  const versions = rows.map((row) => ({
    startsFromMonth: row.startsFromMonth,
    config: parseHouseholdConfig(row.schemaVersion, row.config),
  }));
  const month = edit.startsFromMonth;
  const { base, before, later } = versionsAround(versions, month);
  if (!base) {
    if (month <= activeMonth) {
      throw new ApiError(409, "month_locked", `Pick a month after ${formatMonthLabel(activeMonth)}.`);
    }
    throw new ApiError(404, "no_version", "The household has no setup for this month.");
  }
  if (!person || !base.config.people.some((p) => p.personId === edit.personId)) {
    throw new ApiError(404, "no_person", "This person is not in the household for this month.");
  }
  return {
    plan: planHouseholdEdit({ edit, person, activeMonth, base, before, later }),
    existing: rows.find((row) => row.startsFromMonth === month) ?? null,
  };
}

/**
 * Works out what an edit would change. Nothing is stored. Rule failures come back in `errors`, so the
 * form can show them as they are typed.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param edit - The edit.
 * @returns The summary groups, whether Save is allowed, the errors per field and any later-version warning.
 * @throws {ApiError} 409 `no_household` before first run; 409 `month_locked` for the active month or
 * earlier with no version in effect; 404 `no_version` for a later month before every version; 404
 * `no_person` for an unknown person or someone not in the version.
 */
export async function previewHouseholdEdit(db: HouseholdEditReadDb, edit: HouseholdEdit): Promise<HouseholdEditPreviewResponse> {
  const { plan } = await loadPlan(db, edit);
  return {
    groups: plan.groups,
    canSave: plan.canSave,
    errors: plan.errors,
    laterVersionWarning: plan.laterVersionWarning,
  };
}

/**
 * Saves an edit in one transaction, running the preview's checks again. Name, WhatsApp and color go on
 * the `Person` row; dated values update the version starting that month while no month has opened
 * using it, or create one from the version in effect. An edit that changes only the row stores no version.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param edit - The edit.
 * @returns The month the dated values start from, or null when there were none.
 * @throws {ApiError} The preview's 404s and 409 `no_household`; 409 `month_locked` for a dated change on
 * the active month or earlier; 409 `version_locked` when a month has opened using the version; 409
 * `version_conflict` when a second save created the same month first; 422 `invalid_edit` when a rule
 * fails; 422 `no_changes` when there is nothing to store.
 */
export async function saveHouseholdEdit(db: HouseholdEditDb, edit: HouseholdEdit): Promise<HouseholdEditSaveResponse> {
  const month = edit.startsFromMonth;
  try {
    return await db.$transaction(async (tx) => {
      const { plan, existing } = await loadPlan(tx, edit);
      if (plan.monthBlocked) throw new ApiError(409, "month_locked", plan.errors.startsFromMonth);
      const messages = Object.values(plan.errors);
      if (messages.length > 0) throw new ApiError(422, "invalid_edit", messages.join(" "));
      if (!plan.canSave) throw new ApiError(422, "no_changes", "There is nothing to save.");

      if (Object.keys(plan.personChanges).length > 0) {
        await tx.person.update({ where: { id: edit.personId }, data: plan.personChanges });
      }
      if (!plan.nextConfig) return { savedFromMonth: null };

      const data = { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: plan.nextConfig };
      if (existing) {
        const { count } = await tx.householdVersion.updateMany({
          where: { id: existing.id, months: { none: {} } },
          data,
        });
        if (count === 0) throw new ApiError(409, "version_locked", "A month has already opened using this version.");
      } else {
        await tx.householdVersion.create({ data: { startsFromMonth: month, ...data } });
      }
      return { savedFromMonth: month };
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, "version_conflict", "This month was just changed. Try again.");
    }
    throw err;
  }
}
