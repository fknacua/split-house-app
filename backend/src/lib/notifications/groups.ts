import {
  notificationGroupKeySchema,
  type NotificationGroupKey,
  type NotificationGroupSwitches,
} from "@splithouse/shared";
import { NOTIFICATION_GROUP_ROWS, type NotificationGroupRow } from "./rows";

/** A `NotificationGroup` row as stored, before its key is checked. */
export interface StoredNotificationGroup {
  key: string;
  label: string;
  detail: string;
  enabled: boolean;
  sortOrder: number;
}

/**
 * Reads the stored switches. A row whose key the code doesn't know is ignored, and a switch with no row (the
 * migration seeds all four, so only a deleted row) takes its seeded values. Pure.
 *
 * @param stored - The `NotificationGroup` rows, in any order.
 * @returns The four switches, by `sortOrder` then key.
 */
export function readNotificationGroups(stored: readonly StoredNotificationGroup[]): NotificationGroupRow[] {
  const known = new Map<NotificationGroupKey, NotificationGroupRow>();
  for (const row of stored) {
    const key = notificationGroupKeySchema.safeParse(row.key);
    if (key.success) known.set(key.data, { ...row, key: key.data });
  }
  return NOTIFICATION_GROUP_ROWS.map((seeded) => known.get(seeded.key) ?? seeded).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key),
  );
}

/**
 * Whether each switch is on.
 *
 * @param groups - The four switches, from {@link readNotificationGroups}.
 * @returns One boolean per switch.
 */
export function notificationGroupSwitches(groups: readonly NotificationGroupRow[]): NotificationGroupSwitches {
  return Object.fromEntries(groups.map((g) => [g.key, g.enabled])) as Record<NotificationGroupKey, boolean>;
}
