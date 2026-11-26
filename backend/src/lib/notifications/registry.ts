import type { DatedAnchor, DeadlineAnchor, EventTrigger, NotificationTypeRule } from "@splithouse/shared";

/** What the code knows about one anchor or trigger: the placeholders it fills in a title or body. */
export interface NotificationSource {
  placeholders: readonly string[];
}

/**
 * Every anchor the code can work out a date for, keyed so a new anchor in the shared schema doesn't compile until it
 * is added here. The functions that find each date join these entries with the reminder list (14.7).
 */
export const NOTIFICATION_ANCHORS: Readonly<Record<DeadlineAnchor | DatedAnchor, NotificationSource>> = {
  /** The 2nd of the month: `{month}` is the month the bill is for, e.g. `November`. */
  "upload-day": { placeholders: ["month"] },
  /**
   * A payer's charges due on one day (overdue: all of them): `{payer}`, `{amount}` (their total), `{items}` (the
   * charges named) and `{due}` (the earliest due date, e.g. `2 Dec`).
   */
  "charge-due": { placeholders: ["payer", "amount", "items", "due"] },
  /** The bill's due date: `{collected}` of `{total}`, and `{due}`. */
  "bill-due": { placeholders: ["collected", "total", "due"] },
  /** The latest aircon charge's date. Fills nothing. */
  "last-aircon": { placeholders: [] },
};

/**
 * Every event the code can detect, keyed so a new trigger in the shared schema doesn't compile until it is added here.
 * The detection on each write joins these entries in 14.8.
 */
export const NOTIFICATION_TRIGGERS: Readonly<Record<EventTrigger, NotificationSource>> = {
  /** A month turning settled: `{month}`, e.g. `November`. */
  "month-settled": { placeholders: ["month"] },
  /** A saved bill that is unusual: `{month}`, `{amount}` (the bill) and `{change}` (`32% higher`, `18% lower`). */
  "unusual-bill": { placeholders: ["month", "amount", "change"] },
};

/**
 * The placeholders a template uses.
 *
 * @param template - A title or body, e.g. `Collect {amount} from {payer}`.
 * @returns Each placeholder's name once, in order of first use, e.g. `["amount", "payer"]`.
 */
export function templatePlaceholders(template: string): string[] {
  return [...new Set([...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))];
}

/**
 * Where a notification type's values come from: its anchor or trigger.
 *
 * @param type - The type's kind and rule.
 * @returns The anchor's or trigger's entry.
 */
export function notificationSource(type: NotificationTypeRule): NotificationSource {
  return type.kind === "event" ? NOTIFICATION_TRIGGERS[type.rule.trigger] : NOTIFICATION_ANCHORS[type.rule.anchor];
}

/**
 * Every title and body of a notification type: three of each for a deadline, one of each otherwise.
 *
 * @param type - The type's kind and rule.
 * @returns The templates, titles and bodies alike.
 */
export function notificationTemplates(type: NotificationTypeRule): string[] {
  const texts = type.kind === "deadline" ? Object.values(type.rule.stages) : [type.rule];
  return texts.flatMap((t) => [t.title, t.body]);
}
