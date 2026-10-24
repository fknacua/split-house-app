import { z } from 'zod';

/**
 * The six notification toggles on the Settings screen (`Settings.dc.html`).
 * Ids match the design.
 */
export const notificationSettingsSchema = z.object({
  upload: z.boolean(),
  tenant1: z.boolean(),
  savings: z.boolean(),
  paysp: z.boolean(),
  checks: z.boolean(),
  fyi: z.boolean(),
});

/** One notification toggle id. */
export type NotificationKey = keyof z.infer<typeof notificationSettingsSchema>;

/** All six notification toggles with their on/off state. */
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

/** The toggle ids, in the order Settings lists them. */
export const NOTIFICATION_KEYS = notificationSettingsSchema.keyof().options;

/** What the design shows before anything is changed: everything on except the silent FYI updates. */
export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  upload: true,
  tenant1: true,
  savings: true,
  paysp: true,
  checks: true,
  fyi: false,
};

const storedSchema = notificationSettingsSchema.partial();

/**
 * Reads the `notifications` JSON of the Settings row. A missing row, an
 * unreadable value or a missing key falls back to the default for that toggle,
 * so Settings always has all six.
 *
 * @param json The stored value, or `undefined` when there is no Settings row.
 * @returns All six toggles.
 */
export function parseNotificationSettings(json: unknown): NotificationSettings {
  const parsed = storedSchema.safeParse(json);
  if (!parsed.success) return { ...DEFAULT_NOTIFICATIONS };
  return { ...DEFAULT_NOTIFICATIONS, ...definedOnly(parsed.data) };
}

/** Drops keys whose value is `undefined`, so a spread never overwrites a default with nothing. */
function definedOnly(stored: Partial<NotificationSettings>): Partial<NotificationSettings> {
  return Object.fromEntries(Object.entries(stored).filter(([, value]) => value !== undefined));
}
