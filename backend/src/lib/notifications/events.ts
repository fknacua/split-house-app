import {
  formatCents,
  formatMonthName,
  type EventRule,
  type EventTrigger,
  type NotificationGroupSwitches,
  type PlannedNotification,
} from "@splithouse/shared";
import { z } from "zod";
import type { UnusualBillChange } from "@/lib/bill/unusual-bill";
import type { NotificationTypeRow } from "./rows";

/** How long after the list is built a pending event FYI is set to fire, so the phone can schedule it first. */
export const EVENT_DELAY_SECONDS = 5;

const DAY_MS = 86_400_000;

/** What each trigger is told about the event that happened. */
export interface TriggerFacts {
  /** The month that turned settled, and the Singapore date it did. */
  "month-settled": { month: string; day: string };
  /** The month whose saved bill is unusual, its Current Charges and how far it is from the recent bills. */
  "unusual-bill": { month: string; amountCents: number; change: UnusualBillChange };
}

/** An event before it is stored: its key, one per event, and the placeholder values it fixes. */
export interface EventDraft {
  key: string;
  params: Record<string, string>;
}

/**
 * One function per trigger, turning what happened into the stored event, keyed so a new trigger doesn't compile until
 * it has one. Each fills exactly the placeholders its registry entry names.
 */
export const EVENT_DRAFTS: { readonly [T in EventTrigger]: (facts: TriggerFacts[T]) => EventDraft } = {
  /** `settled:{month}:{date}`: settling again after being unsettled fires again, at most once a month per day. */
  "month-settled": ({ month, day }) => ({ key: `settled:${month}:${day}`, params: { month: formatMonthName(month) } }),
  /** `unusual:{month}`: once per month. */
  "unusual-bill": ({ month, amountCents, change }) => ({
    key: `unusual:${month}`,
    params: {
      month: formatMonthName(month),
      amount: formatCents(amountCents),
      change: `${change.percent}% ${change.direction}`,
    },
  }),
};

/** A `NotificationEvent`'s `params` as stored: placeholder name to its text. */
export const notificationEventParamsSchema = z.record(z.string(), z.string());

/** A `NotificationEvent` row, as much as the list needs. Expired events are never read. */
export interface PlanEvent {
  id: string;
  key: string;
  typeKey: string;
  params: Record<string, string>;
  status: "PENDING" | "SCHEDULED";
  createdAt: Date;
  /** When the phone scheduled it, once acknowledged. */
  fireAt: Date | null;
}

/** An event with its type's rule, or none when its type is unknown or isn't an event. */
function withRule(event: PlanEvent, types: readonly NotificationTypeRow[]) {
  const type = types.find((t) => t.key === event.typeKey);
  return type?.kind === "event" ? { event, rule: type.rule, groupKey: type.groupKey } : null;
}

/** Whether a pending event has waited longer than its rule allows. */
function isExpired(event: PlanEvent, rule: EventRule, now: Date): boolean {
  return event.status === "PENDING" && now.getTime() - event.createdAt.getTime() > rule.expiresAfterDays * DAY_MS;
}

/**
 * The event FYIs in the list, following the switches. A pending event is set to fire {@link EVENT_DELAY_SECONDS} after
 * `now` and asks to be acknowledged; an acknowledged one comes at the time the phone scheduled it, until that has
 * passed. A pending event past its `expiresAfterDays` is left out (see {@link expiredEventIds}). Pure.
 *
 * @param now - The moment the list is built.
 * @param switches - Whether each Settings switch is on.
 * @param types - The notification types.
 * @param events - The pending and scheduled events.
 * @returns One notification per event to schedule, with the event's key as its id.
 */
export function eventNotifications(
  now: Date,
  switches: NotificationGroupSwitches,
  types: readonly NotificationTypeRow[],
  events: readonly PlanEvent[],
): PlannedNotification[] {
  return events.flatMap((e): PlannedNotification[] => {
    const typed = withRule(e, types);
    if (!typed || !switches[typed.groupKey] || isExpired(e, typed.rule, now)) return [];
    const pending = e.status === "PENDING";
    const fireAt = pending ? new Date(now.getTime() + EVENT_DELAY_SECONDS * 1000) : e.fireAt;
    if (!fireAt || fireAt <= now) return [];
    const fill = (s: string) => s.replace(/\{(\w+)\}/g, (match, key: string) => e.params[key] ?? match);
    return [
      {
        id: e.key,
        channel: typed.rule.channel,
        title: fill(typed.rule.title),
        body: fill(typed.rule.body),
        at: singaporeIso(fireAt),
        tap: null,
        actions: [],
        acknowledge: pending,
      },
    ];
  });
}

/**
 * The pending events that have waited longer than their type's `expiresAfterDays`, whatever the switches, so they can
 * be marked expired and leave the list for good. Pure.
 *
 * @param now - The moment the list is built.
 * @param types - The notification types.
 * @param events - The pending and scheduled events.
 * @returns The ids of the events to expire.
 */
export function expiredEventIds(
  now: Date,
  types: readonly NotificationTypeRow[],
  events: readonly PlanEvent[],
): string[] {
  return events.flatMap((e) => {
    const typed = withRule(e, types);
    return typed && isExpired(e, typed.rule, now) ? [e.id] : [];
  });
}

/** A moment as an ISO string with the Singapore offset, to the second, e.g. `2026-11-29T14:03:05+08:00`. */
function singaporeIso(moment: Date): string {
  const seconds = Math.ceil(moment.getTime() / 1000) * 1000;
  return `${new Date(seconds + 8 * 3_600_000).toISOString().slice(0, 19)}+08:00`;
}
