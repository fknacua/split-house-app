import type { NotificationTypeRow } from "@/lib/notifications/rows";
import { readNotificationTypes, type StoredNotificationType } from "@/lib/notifications/types";

const TYPE_SELECT = { key: true, groupKey: true, kind: true, rule: true } as const;

/** The slice of the Prisma client the type reader uses, so tests can pass an in-memory fake. */
export interface NotificationTypesDb {
  notificationType: {
    findMany(args: { select: typeof TYPE_SELECT }): Promise<StoredNotificationType[]>;
  };
}

/**
 * Reads the notification types. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The types, by key.
 * @throws {z.ZodError} When a stored row's group, kind or rule is one the code doesn't know.
 */
export async function getNotificationTypes(db: NotificationTypesDb): Promise<NotificationTypeRow[]> {
  return readNotificationTypes(await db.notificationType.findMany({ select: TYPE_SELECT }));
}
