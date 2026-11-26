import {
  notificationTypeRuleSchema,
  todayKey,
  type EventTrigger,
  type NotificationAcknowledgeRequest,
  type NotificationAcknowledgeResponse,
} from "@splithouse/shared";
import { UNUSUAL_BILL_HISTORY, unusualBillChange } from "@/lib/bill/unusual-bill";
import { EVENT_DRAFTS, type EventDraft } from "@/lib/notifications/events";
import { now } from "@/lib/now";

const EVENT_TYPE_SELECT = { key: true, kind: true, rule: true, group: { select: { enabled: true } } } as const;

/** The slice of a transaction that finds the event types and stores events, so tests can pass an in-memory fake. */
export interface NotificationEventsTx {
  notificationType: {
    findMany(args: { where: { kind: "event" }; select: typeof EVENT_TYPE_SELECT }): Promise<
      { key: string; kind: string; rule: unknown; group: { enabled: boolean } }[]
    >;
  };
  notificationEvent: {
    createMany(args: {
      data: { key: string; typeKey: string; params: Record<string, string> }[];
      skipDuplicates: true;
    }): Promise<unknown>;
  };
}

/** {@link NotificationEventsTx}, and the reads that tell whether a month is settled. */
export interface SettledEventsTx extends NotificationEventsTx {
  bill: {
    findMany(args: {
      where: { month: { in: string[] } };
      select: { month: true; paidCents: true };
    }): Promise<{ month: string; paidCents: number | null }[]>;
  };
  charge: {
    count(args: { where: { month: string; paidCents: null; person: { isOwner: false } } }): Promise<number>;
  };
}

/** {@link NotificationEventsTx}, and the read of the latest saved bills. */
export interface UnusualBillEventsTx extends NotificationEventsTx {
  bill: {
    findMany(args: {
      where: { month: { lt: string } };
      orderBy: { month: "desc" };
      take: number;
      select: { currentChargesCents: true };
    }): Promise<{ currentChargesCents: number }[]>;
  };
}

/** A check started before a write, finished after it in the same transaction. */
export interface SettledCheck {
  /** Reads the months again and records a settled event for each one that turned settled. */
  finish(): Promise<void>;
}

/**
 * The event types of a trigger whose switch is on. A row whose kind or rule the code can't read is skipped, so a bad
 * row never blocks the write that raised the event (the reminder list fails loudly on it instead).
 */
async function enabledTypeKeys(tx: NotificationEventsTx, trigger: EventTrigger): Promise<string[]> {
  const rows = await tx.notificationType.findMany({ where: { kind: "event" }, select: EVENT_TYPE_SELECT });
  return rows.flatMap((row) => {
    const type = notificationTypeRuleSchema.safeParse({ kind: row.kind, rule: row.rule });
    const matches = type.success && type.data.kind === "event" && type.data.rule.trigger === trigger;
    return matches && row.group.enabled ? [row.key] : [];
  });
}

/** Stores the events under each type, skipping a key already stored (`INSERT … ON CONFLICT DO NOTHING`). */
async function recordEvents(tx: NotificationEventsTx, typeKeys: string[], drafts: EventDraft[]): Promise<void> {
  const data = typeKeys.flatMap((typeKey) => drafts.map((d) => ({ key: d.key, typeKey, params: d.params })));
  if (data.length > 0) await tx.notificationEvent.createMany({ data, skipDuplicates: true });
}

/**
 * The months that are settled, as Home's `isMonthSettled` reads it: a saved bill marked paid, and no charge of
 * someone other than the owner without a payment.
 */
async function settledMonths(tx: SettledEventsTx, months: string[]): Promise<Set<string>> {
  const bills = await tx.bill.findMany({ where: { month: { in: months } }, select: { month: true, paidCents: true } });
  const settled = new Set<string>();
  for (const bill of bills.filter((b) => b.paidCents !== null)) {
    const unpaid = await tx.charge.count({ where: { month: bill.month, paidCents: null, person: { isOwner: false } } });
    if (unpaid === 0) settled.add(bill.month);
  }
  return settled;
}

/**
 * Starts the settled check for a write that can change whether months are settled: reads which of them are settled
 * now, before the write. {@link SettledCheck.finish}, after the write and in the same transaction, records `{Month} is
 * settled` for each month that went from not settled to settled, keyed by the Singapore date so it fires at most once
 * a month per day. Reads nothing while no settled type's switch is on, so nothing is recorded then.
 *
 * @param tx - The write's transaction, or a fake in tests.
 * @param months - The months the write touches, `YYYY-MM` (repeats count once).
 * @returns The check to finish after the write.
 */
export async function beginSettledCheck(tx: SettledEventsTx, months: string[]): Promise<SettledCheck> {
  const unique = [...new Set(months)];
  const typeKeys = unique.length === 0 ? [] : await enabledTypeKeys(tx, "month-settled");
  if (typeKeys.length === 0) return { finish: async () => {} };
  const before = await settledMonths(tx, unique);
  return {
    finish: async () => {
      const after = await settledMonths(tx, unique);
      const day = todayKey(now());
      const drafts = unique
        .filter((month) => after.has(month) && !before.has(month))
        .map((month) => EVENT_DRAFTS["month-settled"]({ month, day }));
      await recordEvents(tx, typeKeys, drafts);
    },
  };
}

/**
 * Records `Unusual bill amount` when a saved bill is unusual by the upload warning's rule (more than 25% from the
 * latest saved bills' average, either way), once per month. Records nothing while no unusual-bill type's switch is on.
 * Call it in the save's transaction.
 *
 * @param tx - The save's transaction, or a fake in tests.
 * @param month - The bill's month, `YYYY-MM`.
 * @param currentChargesCents - The saved Current Charges.
 */
export async function recordUnusualBill(
  tx: UnusualBillEventsTx,
  month: string,
  currentChargesCents: number,
): Promise<void> {
  const typeKeys = await enabledTypeKeys(tx, "unusual-bill");
  if (typeKeys.length === 0) return;
  const recent = await tx.bill.findMany({
    where: { month: { lt: month } },
    orderBy: { month: "desc" },
    take: UNUSUAL_BILL_HISTORY,
    select: { currentChargesCents: true },
  });
  const change = unusualBillChange(currentChargesCents, recent.map((b) => b.currentChargesCents));
  if (!change) return;
  await recordEvents(tx, typeKeys, [EVENT_DRAFTS["unusual-bill"]({ month, amountCents: currentChargesCents, change })]);
}

/** The slice of the Prisma client the acknowledgement uses, so tests can pass an in-memory fake. */
export interface NotificationAcknowledgeDb {
  notificationEvent: {
    updateMany(args: {
      where: { key: string; status: "PENDING" };
      data: { status: "SCHEDULED"; fireAt: Date };
    }): Promise<{ count: number }>;
    findMany(args: {
      where: { key: { in: string[] }; status: "SCHEDULED" };
      select: { key: true };
    }): Promise<{ key: string }[]>;
  };
}

/**
 * Records the event FYIs the phone scheduled: each pending one becomes scheduled at the time the phone gave, so the
 * list keeps it at that time until it passes. An event already acknowledged keeps its time, so a repeat changes
 * nothing; an unknown or expired one is ignored.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param request - The events the phone scheduled, with their times.
 * @returns The ids that are now scheduled.
 */
export async function acknowledgeNotifications(
  db: NotificationAcknowledgeDb,
  request: NotificationAcknowledgeRequest,
): Promise<NotificationAcknowledgeResponse> {
  for (const event of request.events) {
    await db.notificationEvent.updateMany({
      where: { key: event.id, status: "PENDING" },
      data: { status: "SCHEDULED", fireAt: new Date(event.at) },
    });
  }
  const ids = [...new Set(request.events.map((e) => e.id))];
  if (ids.length === 0) return { acknowledged: [] };
  const scheduled = await db.notificationEvent.findMany({
    where: { key: { in: ids }, status: "SCHEDULED" },
    select: { key: true },
  });
  const keys = new Set(scheduled.map((s) => s.key));
  return { acknowledged: ids.filter((id) => keys.has(id)) };
}
