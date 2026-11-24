import { z } from 'zod';
import { notificationToggle } from '../schemas/settings';

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

/** One row of the Notifications card, on Settings and on First run's Reminders page: a toggle and its Switch. */
export const settingsNotificationRowSchema = z.object({
  toggle: notificationToggle,
  /** e.g. `Upload the utilities bill`. */
  name: z.string(),
  /** e.g. `Around the 2nd, daily until uploaded`. */
  detail: z.string(),
  /** Whether the toggle is saved on. The app shows it off and disabled while notifications are blocked. */
  on: z.boolean(),
});

/** One row of the Notifications card. */
export type SettingsNotificationRow = z.infer<typeof settingsNotificationRowSchema>;

/** `GET /api/settings`: the Settings screen, ready to render. */
export const settingsResponseSchema = z.object({
  /** The signed-in account, shown on the Account card. */
  email: z.string(),
  messages: z.array(settingsMessageRowSchema),
  /** The five toggles, in the order the boards list them. */
  notifications: z.array(settingsNotificationRowSchema),
});

/** `GET /api/settings`: the Settings screen, ready to render. */
export type SettingsResponse = z.infer<typeof settingsResponseSchema>;

/**
 * `PUT /api/settings/notifications`: turns one toggle on or off, leaving the others as saved. Answers with the
 * {@link SettingsResponse}.
 */
export const settingsNotificationSaveRequestSchema = z.object({
  toggle: notificationToggle,
  on: z.boolean(),
});

/** `PUT /api/settings/notifications`: turns one toggle on or off. */
export type SettingsNotificationSaveRequest = z.infer<typeof settingsNotificationSaveRequestSchema>;
