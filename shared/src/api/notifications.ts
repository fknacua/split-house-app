import { z } from 'zod';
import { homeTargetSchema } from './home';

/**
 * The three Android channels: `action` (Action needed, heads-up), `checks` (Payment checks) and `fyi` (FYI, silent).
 */
export const notificationChannelSchema = z.enum(['action', 'checks', 'fyi']);

/** One of the three Android channels. */
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

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
   * Stable for the same reminder across rebuilds, e.g. `upload:2026-12-02`, `rent:<chargeId>`, `pay-bill:2026-11` or
   * `check:<chargeId>`. The phone schedules it under this id.
   */
  id: z.string(),
  channel: notificationChannelSchema,
  /** e.g. `Did Sam pay Nov utilities ($82.46)?`. */
  title: z.string(),
  /** e.g. `Due today.`. */
  body: z.string(),
  /** When it fires, an ISO date and time with the Singapore offset, e.g. `2026-11-30T09:00:00+08:00`. */
  at: z.iso.datetime({ offset: true }),
  /** Where a tap opens, or null for Home. */
  tap: homeTargetSchema.nullable(),
  /** Paid then Nudge on Collect rent and payment checks; empty otherwise. */
  actions: z.array(notificationActionSchema),
});

/** One notification the phone schedules. */
export type PlannedNotification = z.infer<typeof plannedNotificationSchema>;

/**
 * `GET /api/notifications/plan`: every notification from now to the end of next month, in time order, following the
 * toggles and the data. The app cancels what it scheduled and schedules these. Empty until First run has finished.
 */
export const notificationPlanResponseSchema = z.object({
  notifications: z.array(plannedNotificationSchema),
});

/** `GET /api/notifications/plan`: every notification to schedule. */
export type NotificationPlanResponse = z.infer<typeof notificationPlanResponseSchema>;
