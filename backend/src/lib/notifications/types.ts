import { notificationGroupKeySchema, parseNotificationTypeRule } from "@splithouse/shared";
import type { NotificationTypeRow } from "./rows";

/** A `NotificationType` row as stored, before its group, kind and rule are checked. */
export interface StoredNotificationType {
  key: string;
  groupKey: string;
  kind: string;
  rule: unknown;
}

/**
 * Reads the stored notification types. Pure.
 *
 * @param stored - The `NotificationType` rows, in any order.
 * @returns The types, by key.
 * @throws {z.ZodError} When a row's group, kind or rule is one the code doesn't know, so a bad row fails loudly
 *   instead of scheduling the wrong thing.
 */
export function readNotificationTypes(stored: readonly StoredNotificationType[]): NotificationTypeRow[] {
  return stored
    .map((row) => ({
      key: row.key,
      groupKey: notificationGroupKeySchema.parse(row.groupKey),
      ...parseNotificationTypeRule(row.kind, row.rule),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}
