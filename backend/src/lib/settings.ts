import { z } from "zod";

// The six notification toggles on the Settings screen (Settings.dc.html). Ids match the design.
export const NOTIFICATION_KEYS = [
  "upload",
  "tenant1",
  "savings",
  "paysp",
  "checks",
  "fyi",
] as const;
export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];
export type NotificationSettings = Record<NotificationKey, boolean>;

// What the design shows before anything is changed: everything on except the silent FYI updates.
export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  upload: true,
  tenant1: true,
  savings: true,
  paysp: true,
  checks: true,
  fyi: false,
};

const storedSchema = z.object(
  Object.fromEntries(NOTIFICATION_KEYS.map((key) => [key, z.boolean().optional()])),
);

// Reads the `notifications` JSON of the Settings row. A missing row, an unreadable value or a
// missing key falls back to the default for that toggle, so Settings always has all six.
export function parseNotificationSettings(json: unknown): NotificationSettings {
  const parsed = storedSchema.safeParse(json);
  if (!parsed.success) return { ...DEFAULT_NOTIFICATIONS };
  const stored = parsed.data as Partial<NotificationSettings>;
  const result = { ...DEFAULT_NOTIFICATIONS };
  for (const key of NOTIFICATION_KEYS) {
    const value = stored[key];
    if (value !== undefined) result[key] = value;
  }
  return result;
}
