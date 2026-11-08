import { z } from 'zod';

/**
 * One row of the Message templates card, on Settings and on First run's Custom messages: a template, when it is sent,
 * and how many people have a custom template of it. The row opens that template's landing page.
 */
export const settingsMessageRowSchema = z.object({
  /** Which template the row opens. */
  kind: z.enum(['MONTHLY', 'NUDGE']),
  /** e.g. `Monthly breakdown`. */
  name: z.string(),
  /** e.g. `Sent when the month’s charges are ready`. */
  description: z.string(),
  /** `Same for everyone`, or e.g. `Custom templates: 1`. */
  detail: z.string(),
  /** `success` while anyone has a custom template, `muted` for `Same for everyone`. */
  tone: z.enum(['success', 'muted']),
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
