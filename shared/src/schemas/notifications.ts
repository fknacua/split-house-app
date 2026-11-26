import { z } from 'zod';

/** The four Settings switches (`NotificationGroup.key`), in the order Settings and First run's Reminders list them. */
export const NOTIFICATION_GROUP_KEYS = ['uploadBill', 'collectPayments', 'payBill', 'fyi'] as const;

/** One Settings switch: a group of notifications turned on or off together. */
export const notificationGroupKeySchema = z.enum(NOTIFICATION_GROUP_KEYS);

/** One Settings switch. */
export type NotificationGroupKey = z.infer<typeof notificationGroupKeySchema>;

/** Whether each switch is on. */
export type NotificationGroupSwitches = Readonly<Record<NotificationGroupKey, boolean>>;

/**
 * The three Android channels, by id: `action` (Action needed, heads-up), `checks` (Reminders, a sound and no heads-up;
 * first created as Payment checks, so the id stays) and `fyi` (FYI, silent).
 */
export const notificationChannelSchema = z.enum(['action', 'checks', 'fyi']);

/** One of the three Android channels. */
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

/** Which date a `deadline` notification is due on: the 2nd of the month, a charge's due date, the bill's due date. */
export const DEADLINE_ANCHORS = ['upload-day', 'charge-due', 'bill-due'] as const;

/** Which date a `dated` notification counts from: the latest aircon charge. */
export const DATED_ANCHORS = ['last-aircon'] as const;

/** What raises an `event` notification: a month turning settled, a saved bill that is unusual. */
export const EVENT_TRIGGERS = ['month-settled', 'unusual-bill'] as const;

/** Which date a `deadline` notification is due on. */
export type DeadlineAnchor = (typeof DEADLINE_ANCHORS)[number];

/** Which date a `dated` notification counts from. */
export type DatedAnchor = (typeof DATED_ANCHORS)[number];

/** What raises an `event` notification. */
export type EventTrigger = (typeof EVENT_TRIGGERS)[number];

/** A time of day in Singapore, `HH:mm`, e.g. `08:00`. */
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected a time as HH:mm');

/**
 * What one notification shows and where: its channel and its title and body templates. A template holds typed
 * placeholders such as `{month}` or `{payer}`, filled by the code for its anchor or trigger.
 */
export const notificationTextSchema = z.object({
  channel: notificationChannelSchema,
  title: z.string().min(1),
  body: z.string().min(1),
});

/** What one notification shows and where. */
export type NotificationText = z.infer<typeof notificationTextSchema>;

/**
 * A `deadline` rule: three stages at `time`, due tomorrow (the day before, once), due today (once) and overdue (every
 * day after, until done).
 */
export const deadlineRuleSchema = z.object({
  anchor: z.enum(DEADLINE_ANCHORS),
  time: timeOfDay,
  stages: z.object({
    dueTomorrow: notificationTextSchema,
    dueToday: notificationTextSchema,
    overdue: notificationTextSchema,
  }),
});

/** A `deadline` rule. */
export type DeadlineRule = z.infer<typeof deadlineRuleSchema>;

/** A `dated` rule: once, at `time`, `offsetDays` after the anchor's date. */
export const datedRuleSchema = notificationTextSchema.extend({
  anchor: z.enum(DATED_ANCHORS),
  offsetDays: z.number().int().positive(),
  time: timeOfDay,
});

/** A `dated` rule. */
export type DatedRule = z.infer<typeof datedRuleSchema>;

/**
 * An `event` rule: fires when its trigger happens. `immediate` is a few seconds after the phone schedules it; an event
 * the phone never schedules is dropped after `expiresAfterDays`.
 */
export const eventRuleSchema = notificationTextSchema.extend({
  trigger: z.enum(EVENT_TRIGGERS),
  delay: z.literal('immediate'),
  expiresAfterDays: z.number().int().positive(),
});

/** An `event` rule. */
export type EventRule = z.infer<typeof eventRuleSchema>;

/**
 * A `NotificationType` row's `kind` and `rule` together: `kind` decides the shape of `rule`, which is stored as JSON.
 */
export const notificationTypeRuleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('deadline'), rule: deadlineRuleSchema }),
  z.object({ kind: z.literal('dated'), rule: datedRuleSchema }),
  z.object({ kind: z.literal('event'), rule: eventRuleSchema }),
]);

/** A `NotificationType` row's `kind` and `rule` together. */
export type NotificationTypeRule = z.infer<typeof notificationTypeRuleSchema>;

/** A notification type's kind: `deadline`, `dated` or `event`. */
export type NotificationKind = NotificationTypeRule['kind'];

/**
 * Reads a `NotificationType` row's stored `kind` and `rule`.
 *
 * @param kind - `NotificationType.kind` as stored.
 * @param rule - `NotificationType.rule` as stored.
 * @returns The kind and its rule.
 * @throws {z.ZodError} When the kind is unknown or the rule doesn't have that kind's shape, so a bad row fails loudly
 *   instead of scheduling the wrong thing.
 */
export function parseNotificationTypeRule(kind: string, rule: unknown): NotificationTypeRule {
  return notificationTypeRuleSchema.parse({ kind, rule });
}
