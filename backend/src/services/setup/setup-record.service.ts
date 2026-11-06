import type { SetupStepId } from "@splithouse/shared";
import { doneStepsOf } from "@/lib/setup/steps";

const SETUP_ID = "singleton";
const SETUP_SELECT = { startMonth: true, doneSteps: true } as const;

/** The reads of the `Setup` row, so tests can pass an in-memory fake. */
export interface SetupReadDb {
  setup: {
    findUnique(args: {
      where: { id: typeof SETUP_ID };
      select: typeof SETUP_SELECT;
    }): Promise<{ startMonth: string | null; doneSteps: string[] } | null>;
  };
}

/** The writes of the `Setup` row. */
export interface SetupWriteDb extends SetupReadDb {
  setup: SetupReadDb["setup"] & {
    upsert(args: {
      where: { id: typeof SETUP_ID };
      create: { id: typeof SETUP_ID; startMonth?: string; doneSteps: string[] };
      update: { startMonth?: string; doneSteps: string[] };
      select: typeof SETUP_SELECT;
    }): Promise<{ startMonth: string | null; doneSteps: string[] }>;
  };
}

/** First run's record: the saved start month and the steps done. */
export interface SetupRecord {
  /** `YYYY-MM`, null until Start month is saved. */
  startMonth: string | null;
  /** In step order. */
  doneSteps: SetupStepId[];
}

/**
 * Reads First run's record, empty when the row is not created yet.
 *
 * @param db - The Prisma client, a transaction, or a fake in tests.
 * @returns The saved start month and the done steps.
 */
export async function readSetup(db: SetupReadDb): Promise<SetupRecord> {
  const row = await db.setup.findUnique({ where: { id: SETUP_ID }, select: SETUP_SELECT });
  return { startMonth: row?.startMonth ?? null, doneSteps: doneStepsOf(row?.doneSteps ?? []) };
}

/**
 * Records steps as done, and the start month when given, creating the row on first write.
 *
 * @param db - The Prisma client, a transaction, or a fake in tests.
 * @param steps - The steps to add. Steps already done stay done.
 * @param startMonth - The start month to save, or undefined to keep it.
 * @returns The record after the write.
 */
export async function markStepsDone(db: SetupWriteDb, steps: SetupStepId[], startMonth?: string): Promise<SetupRecord> {
  const { doneSteps } = await readSetup(db);
  const next = doneStepsOf([...doneSteps, ...steps]);
  const row = await db.setup.upsert({
    where: { id: SETUP_ID },
    create: { id: SETUP_ID, startMonth, doneSteps: next },
    update: { startMonth, doneSteps: next },
    select: SETUP_SELECT,
  });
  return { startMonth: row.startMonth, doneSteps: doneStepsOf(row.doneSteps) };
}
