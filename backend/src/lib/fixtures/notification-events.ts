import { NOTIFICATION_TYPE_ROWS } from "@/lib/notifications/rows";

/** An event as a fake stores it. */
export interface FakeStoredEvent {
  key: string;
  typeKey: string;
  params: Record<string, string>;
}

/**
 * In-memory `NotificationType` and `NotificationEvent` tables for test fakes of a write's transaction: the seeded
 * event types, with FYI updates on or off, and the events the write stores (a key already stored is skipped, as
 * `ON CONFLICT DO NOTHING` does).
 *
 * @param options - `fyi`: whether the FYI updates switch is on (off by default, as seeded).
 * @returns The two tables to spread into the fake, and the events stored so far.
 */
export function fakeEventTables({ fyi = false } = {}) {
  const stored: FakeStoredEvent[] = [];
  return {
    stored,
    tables: {
      notificationType: {
        findMany: async () =>
          NOTIFICATION_TYPE_ROWS.filter((t) => t.kind === "event").map((t) => ({
            key: t.key,
            kind: t.kind,
            rule: t.rule as unknown,
            group: { enabled: fyi },
          })),
      },
      notificationEvent: {
        createMany: async ({ data }: { data: FakeStoredEvent[]; skipDuplicates: true }) => {
          const fresh = data.filter((d) => !stored.some((s) => s.key === d.key));
          stored.push(...fresh);
          return { count: fresh.length };
        },
      },
    },
  };
}
