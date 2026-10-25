import { z } from 'zod';
import { monthKey } from '../schemas/primitives';
import { notificationSettingsSchema } from '../schemas/settings';
import { setupStepSchema } from '../schemas/setup';

/** `GET /api/bootstrap`: what the app needs right after sign-in and on launch. */
export const bootstrapResponseSchema = z.object({
  /** A household version exists. False sends the app to first-run setup. */
  hasHousehold: z.boolean(),
  /** The active billing month, `YYYY-MM`: the newest opened month, or the calendar month in Asia/Singapore when that is later. */
  currentMonth: monthKey,
  /** The first-run checklist, in display order. */
  setupProgress: z.array(setupStepSchema),
  /** Notification toggles, used to rebuild the reminders on this phone. */
  settings: z.object({ notifications: notificationSettingsSchema }),
});

/** `GET /api/bootstrap`: what the app needs right after sign-in and on launch. */
export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
