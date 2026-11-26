import type { NotificationGroupKey } from "@splithouse/shared";
import { readNotificationGroups, type StoredNotificationGroup } from "@/lib/notifications/groups";
import { NOTIFICATION_GROUP_ROWS, type NotificationGroupRow } from "@/lib/notifications/rows";

const GROUP_SELECT = { key: true, label: true, detail: true, enabled: true, sortOrder: true } as const;

/** The slice of the Prisma client the switch reader uses, so tests can pass an in-memory fake. */
export interface NotificationGroupsDb {
  notificationGroup: {
    findMany(args: { select: typeof GROUP_SELECT }): Promise<StoredNotificationGroup[]>;
  };
}

/** {@link NotificationGroupsDb}, and the write that saves a switch. */
export interface NotificationGroupsSaveDb extends NotificationGroupsDb {
  notificationGroup: NotificationGroupsDb["notificationGroup"] & {
    upsert(args: {
      where: { key: NotificationGroupKey };
      create: NotificationGroupRow;
      update: { enabled: boolean };
    }): Promise<unknown>;
  };
}

/**
 * Reads the four Settings switches. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The switches in their saved order; a switch with no row takes its seeded values.
 */
export async function getNotificationGroups(db: NotificationGroupsDb): Promise<NotificationGroupRow[]> {
  return readNotificationGroups(await db.notificationGroup.findMany({ select: GROUP_SELECT }));
}

/**
 * Turns one switch on or off, leaving the others as saved. A switch with no row gets its seeded row. Safe to repeat.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param key - The switch.
 * @param enabled - Whether it is on.
 */
export async function saveNotificationGroup(
  db: NotificationGroupsSaveDb,
  key: NotificationGroupKey,
  enabled: boolean,
): Promise<void> {
  const seeded = NOTIFICATION_GROUP_ROWS.find((g) => g.key === key);
  if (!seeded) throw new Error(`No seeded notification group ${key}`);
  await db.notificationGroup.upsert({ where: { key }, create: { ...seeded, enabled }, update: { enabled } });
}
