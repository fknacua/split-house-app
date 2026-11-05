import { z } from 'zod';

/** One row of the Messages card: a template and how many people have their own version of it. */
export const settingsMessageRowSchema = z.object({
  /** Which template the row opens. */
  kind: z.enum(['MONTHLY', 'NUDGE']),
  name: z.string(),
  /** "Same for everyone", or the number of custom versions. */
  detail: z.string(),
});

/** One row of the Messages card on Settings. */
export type SettingsMessageRow = z.infer<typeof settingsMessageRowSchema>;

/** `GET /api/settings`: the Settings screen, ready to render. */
export const settingsResponseSchema = z.object({
  /** The signed-in account, shown on the Account card. */
  email: z.string(),
  messages: z.array(settingsMessageRowSchema),
});

/** `GET /api/settings`: the Settings screen, ready to render. */
export type SettingsResponse = z.infer<typeof settingsResponseSchema>;
