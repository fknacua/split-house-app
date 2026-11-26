import { z } from 'zod';
import { notificationChannelSchema } from '../schemas/notifications';
import { homeTargetSchema } from './home';

/** A button on a notification. Each brings the app to the foreground on its target; nothing is sent or marked. */
export const notificationActionSchema = z.object({
  /** `paid` is the `Paid` button, `nudge` the `Nudge` button. */
  kind: z.enum(['paid', 'nudge']),
  /** `mark-paid` for Paid, `send-nudge` for Nudge. */
  target: homeTargetSchema,
});

/** A button on a notification. */
export type NotificationAction = z.infer<typeof notificationActionSchema>;

/** One notification the phone schedules, display-ready. */
export const plannedNotificationSchema = z.object({
  /**
   * Stable for the same reminder across rebuilds: the type, the stage, what it is about and the day, e.g.
   * `uploadBill:dueToday:2026-12:2026-12-02`, `collectPayments:overdue:<payerId>:2026-11-06` or
   * `payBill:dueTomorrow:2026-11:2026-11-24`; a dated one is the type and the day, e.g. `airconDue:2027-02-18`; an
   * event FYI is its event's key, e.g. `settled:2026-11:2026-11-29` or `unusual:2026-12`. The phone schedules it under
   * this id.
   */
  id: z.string(),
  channel: notificationChannelSchema,
  /** e.g. `Collect $82.46 from Sam`. */
  title: z.string(),
  /** e.g. `Nov utilities. Due today.`. */
  body: z.string(),
  /** When it fires, an ISO date and time with the Singapore offset, e.g. `2026-11-30T08:00:00+08:00`. */
  at: z.iso.datetime({ offset: true }),
  /** Where a tap opens, or null for Home. */
  tap: homeTargetSchema.nullable(),
  /** Paid then Nudge on Collect tenant payments; empty otherwise. */
  actions: z.array(notificationActionSchema),
  /**
   * True for an event FYI the phone hasn't scheduled yet (`at` is a few seconds after the list was built): once it is
   * scheduled, the phone sends its id and the time it was scheduled for to `POST /api/notifications/acknowledge`.
   * False for everything else, an acknowledged event FYI included (it comes back at its acknowledged time until that
   * passes).
   */
  acknowledge: z.boolean(),
});

/** One notification the phone schedules. */
export type PlannedNotification = z.infer<typeof plannedNotificationSchema>;

/**
 * `GET /api/notifications/plan`: every notification for the next 14 days, in time order, following the switches, the
 * notification types and the data. The app cancels what it scheduled and schedules these. Empty until First run has
 * finished.
 */
export const notificationPlanResponseSchema = z.object({
  notifications: z.array(plannedNotificationSchema),
});

/** `GET /api/notifications/plan`: every notification to schedule. */
export type NotificationPlanResponse = z.infer<typeof notificationPlanResponseSchema>;

/** One event FYI the phone scheduled. */
export const notificationAcknowledgeEventSchema = z.object({
  /** The notification's id, which is its event's key, e.g. `settled:2026-11:2026-11-29`. */
  id: z.string().min(1),
  /** When the phone scheduled it to fire, an ISO date and time with an offset. */
  at: z.iso.datetime({ offset: true }),
});

/** One event FYI the phone scheduled. */
export type NotificationAcknowledgeEvent = z.infer<typeof notificationAcknowledgeEventSchema>;

/**
 * `POST /api/notifications/acknowledge`: the event FYIs (`acknowledge: true` in the list) the phone actually
 * scheduled, so with the permission off nothing is sent and the events wait for a later list. Safe to repeat.
 */
export const notificationAcknowledgeRequestSchema = z.object({
  events: z.array(notificationAcknowledgeEventSchema),
});

/** `POST /api/notifications/acknowledge`: the event FYIs the phone scheduled. */
export type NotificationAcknowledgeRequest = z.infer<typeof notificationAcknowledgeRequestSchema>;

/**
 * `POST /api/notifications/acknowledge`: the ids now scheduled, those just acknowledged and any acknowledged before. An
 * unknown or expired id is left out.
 */
export const notificationAcknowledgeResponseSchema = z.object({
  acknowledged: z.array(z.string()),
});

/** `POST /api/notifications/acknowledge`: the ids now scheduled. */
export type NotificationAcknowledgeResponse = z.infer<typeof notificationAcknowledgeResponseSchema>;
