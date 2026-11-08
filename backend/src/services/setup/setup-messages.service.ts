import type { HouseholdConfig, SetupMessagesResponse, SetupSaveResponse } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { buildMessagesPage, discardCustomTemplates } from "@/lib/setup/build-messages";
import { requireStepsBefore } from "@/lib/setup/steps";
import { readFormContext, requireConfig, type HouseholdFormDb } from "@/services/household/household-form.service";
import {
  readMessageTemplates,
  writeMessageTemplates,
  type MessageTemplatesDb,
  type MessageTemplatesWriteDb,
} from "@/services/templates/message-templates.service";
import { markStepsDone, type SetupWriteDb } from "./setup-record.service";

/** The reads of the Custom messages page, so tests can pass an in-memory fake. */
export type SetupMessagesDb = HouseholdFormDb & MessageTemplatesDb;

/** What discarding writes, in one transaction. */
export type SetupMessagesDiscardTx = MessageTemplatesDb & MessageTemplatesWriteDb & SetupWriteDb;

/** The Prisma client, or a fake in tests. */
export interface SetupMessagesDiscardDb extends SetupMessagesDb {
  $transaction<T>(fn: (tx: SetupMessagesDiscardTx) => Promise<T>): Promise<T>;
}

/**
 * Reads First run's one version for Custom messages, refusing outside First run and before the required steps.
 *
 * @throws {ApiError} 409 `setup_done` once a month is open; 409 for the first required step not done.
 */
async function readMessagesStep(db: SetupMessagesDb): Promise<HouseholdConfig> {
  const context = await readFormContext(db);
  if (!context.firstSetup) throw new ApiError(409, "setup_done", "The household is already set up.");
  requireStepsBefore("messages", context.doneSteps);
  return requireConfig(context).config;
}

/**
 * Reads First run's Custom messages page. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The page, ready to render.
 * @throws {ApiError} 409 `setup_done` once a month is open; 409 for the first required step not done
 * (`start_month_first`, `rooms_first`, `people_first`, `splits_first`).
 */
export async function getSetupMessages(db: SetupMessagesDb): Promise<SetupMessagesResponse> {
  const [config, templates] = await Promise.all([readMessagesStep(db), readMessageTemplates(db)]);
  return buildMessagesPage(config, templates);
}

/**
 * Discards every custom template, Monthly breakdown and Nudge, with their section titles, and skips Custom messages:
 * it counts as done, as `Not now` without a template does, so Welcome moves on. The Defaults and line labels stay.
 * Discarding with none is harmless.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The steps now done.
 * @throws {ApiError} The same as `getSetupMessages`.
 */
export async function discardSetupMessages(db: SetupMessagesDiscardDb): Promise<SetupSaveResponse> {
  await readMessagesStep(db);
  return db.$transaction(async (tx) => {
    await writeMessageTemplates(tx, discardCustomTemplates(await readMessageTemplates(tx)));
    return { doneSteps: (await markStepsDone(tx, ["messages"])).doneSteps };
  });
}
