import {
  parseHouseholdConfig,
  todayKey,
  type SetupFinishResponse,
  type SetupMarkableStep,
  type SetupResponse,
  type SetupSaveResponse,
  type SetupStartMonthRequest,
  type SetupStartMonthResponse,
} from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { currentMonth } from "@/lib/month";
import { openMonthIfNeeded, type MonthOpenDb } from "@/lib/month-open";
import { now } from "@/lib/now";
import { hasCustomTemplate } from "@/lib/setup/build-messages";
import { buildWelcome } from "@/lib/setup/build-welcome";
import { buildStartMonthPage, effectiveStartMonth } from "@/lib/setup/start-month";
import { requiredStepsDone, requireStepsBefore } from "@/lib/setup/steps";
import type { ActiveMonthDb } from "@/services/months/active-month.service";
import { readMessageTemplates, type MessageTemplatesDb } from "@/services/templates/message-templates.service";
import { markStepsDone, readSetup, type SetupReadDb, type SetupRecord, type SetupWriteDb } from "./setup-record.service";

/** The reads First run's pages need, so tests can pass an in-memory fake. */
export interface SetupDb extends ActiveMonthDb, SetupReadDb {}

/** What saving the start month or marking a step needs. */
export interface SetupSaveTx extends SetupWriteDb {
  householdVersion: {
    findMany(args: {
      select: { schemaVersion: true; config: true };
    }): Promise<{ schemaVersion: number; config: unknown }[]>;
    updateMany(args: {
      where: { months: { none: object } };
      data: { startsFromMonth: string };
    }): Promise<{ count: number }>;
  };
}

/** The Prisma client, or a fake in tests. */
export interface SetupSaveDb extends ActiveMonthDb, SetupSaveTx {
  $transaction<T>(fn: (tx: SetupSaveTx) => Promise<T>): Promise<T>;
}

/** What marking People or Custom messages needs: the saves, and the wording for Custom messages. */
export type SetupMarkDb = SetupSaveDb & MessageTemplatesDb;

/** What finishing needs: the saves, and opening the start month. */
export type SetupFinishDb = SetupSaveDb & MonthOpenDb;

/**
 * Reads First run's record, refusing once First run is finished.
 *
 * @throws {ApiError} 409 `setup_done` once a month is open.
 */
async function readFirstRun(db: SetupDb): Promise<SetupRecord> {
  const opened = await db.month.findFirst({ orderBy: { month: "desc" }, select: { month: true } });
  if (opened) throw new ApiError(409, "setup_done", "The household is already set up.");
  return readSetup(db);
}

/**
 * Moves First run's one version, while no month has opened using it, to start from `month`. Does nothing before
 * Rent & rooms is saved, when there is no version yet.
 */
async function moveFirstVersion(tx: SetupSaveTx, month: string): Promise<void> {
  await tx.householdVersion.updateMany({ where: { months: { none: {} } }, data: { startsFromMonth: month } });
}

/**
 * Reads Welcome. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns Welcome, ready to render.
 * @throws {ApiError} 409 `setup_done` once a month is open.
 */
export async function getSetup(db: SetupDb): Promise<SetupResponse> {
  const { doneSteps } = await readFirstRun(db);
  return buildWelcome(doneSteps);
}

/**
 * Reads the Start month page, worked out from today in Singapore. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The page.
 * @throws {ApiError} 409 `setup_done` once a month is open.
 */
export async function getSetupStartMonth(db: SetupDb): Promise<SetupStartMonthResponse> {
  const { startMonth } = await readFirstRun(db);
  return buildStartMonthPage({ today: todayKey(now()), saved: startMonth });
}

/**
 * Saves the start month and marks Start month done, moving the first version to start from it when Rent & rooms
 * is already saved.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param request - The month.
 * @returns The steps now done.
 * @throws {ApiError} 409 `setup_done` once a month is open; 422 `invalid_month` for a month before the current one.
 */
export async function saveSetupStartMonth(db: SetupSaveDb, { month }: SetupStartMonthRequest): Promise<SetupSaveResponse> {
  await readFirstRun(db);
  if (month < currentMonth()) throw new ApiError(422, "invalid_month", "Choose this month or a later one.");
  return db.$transaction(async (tx) => {
    const { doneSteps } = await markStepsDone(tx, ["startMonth"], month);
    await moveFirstVersion(tx, month);
    return { doneSteps };
  });
}

/**
 * Marks People or Custom messages done, from their pages' Save. The steps before it must be done, People needs
 * someone besides the owner, and Custom messages a custom template (the page's Save is disabled until then).
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param step - The step.
 * @returns The steps now done.
 * @throws {ApiError} 409 `setup_done` once a month is open; 409 for the first earlier step not done (see
 * `requireStepsBefore`); 409 `no_people` for People while nobody but the owner is in the household; 409
 * `no_templates` for Custom messages while nobody in it has a custom template.
 */
export async function markSetupStep(db: SetupMarkDb, step: SetupMarkableStep): Promise<SetupSaveResponse> {
  const { doneSteps } = await readFirstRun(db);
  requireStepsBefore(step, doneSteps);
  const [version] = await db.householdVersion.findMany({ select: { schemaVersion: true, config: true } });
  const config = version ? parseHouseholdConfig(version.schemaVersion, version.config) : null;
  if (step === "people" && !config?.people.some((p) => p.role !== "OWNER")) {
    throw new ApiError(409, "no_people", "Add someone first.");
  }
  if (step === "messages" && !(config && hasCustomTemplate(config, await readMessageTemplates(db)))) {
    throw new ApiError(409, "no_templates", "Add a custom template first.");
  }
  return { doneSteps: (await markStepsDone(db, [step])).doneSteps };
}

/**
 * Finishes First run: starts the first version from the start month and opens that month, early if it is in the
 * future, as Start next month does.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The opened month. The app goes to Home, which asks for the month's bill.
 * @throws {ApiError} 409 `setup_done` once a month is open; 409 `steps_incomplete` until every required step is done.
 */
export async function finishSetup(db: SetupFinishDb): Promise<SetupFinishResponse> {
  const { startMonth, doneSteps } = await readFirstRun(db);
  if (!requiredStepsDone(doneSteps)) {
    throw new ApiError(409, "steps_incomplete", "Finish the required steps first.");
  }
  const month = effectiveStartMonth(startMonth, currentMonth());
  await moveFirstVersion(db, month);
  const opened = await openMonthIfNeeded(db, month);
  if (!opened) throw new Error(`No household version starts on or before ${month}`);
  return { month };
}
