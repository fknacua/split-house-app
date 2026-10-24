import { z } from 'zod';

/** The first-run checklist, in the order of `Welcome.dc.html`. */
export const SETUP_STEP_IDS = ['rentAndRooms', 'people', 'yourSplit', 'messages', 'reminders'] as const;

/** One of {@link SETUP_STEP_IDS}. */
export type SetupStepId = (typeof SETUP_STEP_IDS)[number];

/** One row of the first-run checklist. */
export const setupStepSchema = z.object({
  id: z.enum(SETUP_STEP_IDS),
  /** Messages and Reminders can be skipped; the other three are needed before Home opens. */
  optional: z.boolean(),
  done: z.boolean(),
});

/** One row of the first-run checklist. */
export type SetupStep = z.infer<typeof setupStepSchema>;
