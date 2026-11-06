import { z } from 'zod';
import { monthKey } from '../schemas/primitives';

/** `GET /api/bootstrap`: what the app needs right after sign-in and on launch. */
export const bootstrapResponseSchema = z.object({
  /** A household version exists. */
  hasHousehold: z.boolean(),
  /** First run is finished: a month is open. False sends the app to Welcome. */
  setupComplete: z.boolean(),
  /** The active billing month, `YYYY-MM`: the newest opened month, or the calendar month in Asia/Singapore when that is later. */
  currentMonth: monthKey,
});

/** `GET /api/bootstrap`: what the app needs right after sign-in and on launch. */
export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
