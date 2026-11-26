import * as Notifications from 'expo-notifications';
import type {
  NotificationAcknowledgeEvent,
  NotificationAcknowledgeRequest,
  NotificationAcknowledgeResponse,
  NotificationPlanResponse,
  PlannedNotification,
} from '@splithouse/shared';

import { apiFetch } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { PAID_NUDGE_CATEGORY, setUpNotificationChannels } from './channels';

/** What a scheduled notification carries besides its text, read back when it is tapped (14.3, 14.4). */
export type NotificationData = Pick<PlannedNotification, 'id' | 'channel' | 'tap' | 'actions'>;

/** Fetches the plan (`GET /api/notifications/plan`). */
export function fetchNotificationPlan(): Promise<NotificationPlanResponse> {
  return apiFetch<NotificationPlanResponse>('/api/notifications/plan');
}

/**
 * The notification's content as the phone shows it, with its id, channel and targets in `data`.
 *
 * @param notification - One notification of the plan.
 * @returns The content to schedule.
 */
export function notificationContent(notification: PlannedNotification): Notifications.NotificationContentInput {
  const data: NotificationData = {
    id: notification.id,
    channel: notification.channel,
    tap: notification.tap,
    actions: notification.actions,
  };
  return {
    title: notification.title,
    body: notification.body,
    data,
    ...(notification.actions.length > 0 ? { categoryIdentifier: PAID_NUDGE_CATEGORY } : {}),
  };
}

/**
 * Whether the phone lets the app show notifications.
 *
 * @returns True once the permission is granted.
 */
export async function notificationsAllowed(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/**
 * Shows the OS permission dialog on a phone where it was never shown (a new phone or a reinstall). Does nothing once
 * the user has answered, so a denied permission is only changed in system settings. Sets up the channels first, since
 * Android 13 and later needs one before it shows the dialog.
 *
 * @returns True when notifications are allowed afterwards.
 */
export async function askForNotificationsIfNeverAsked(): Promise<boolean> {
  await setUpNotificationChannels();
  const status = await Notifications.getPermissionsAsync();
  if (status.granted) return true;
  if (status.status !== 'undetermined' || !status.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** How soon an event FYI fires at the earliest once it is scheduled, so one whose `at` passed while the list loaded still comes. */
export const EVENT_FYI_DELAY_MS = 5_000;

/**
 * When the phone schedules a notification: its `at`, except that an event FYI still to be acknowledged fires no
 * sooner than {@link EVENT_FYI_DELAY_MS} from now.
 *
 * @param notification - One notification of the plan.
 * @param nowMs - The phone's clock, in milliseconds.
 * @returns The moment to schedule it for.
 */
export function scheduledTime(notification: PlannedNotification, nowMs: number): Date {
  const at = new Date(notification.at);
  if (!notification.acknowledge) return at;
  return new Date(Math.max(at.getTime(), nowMs + EVENT_FYI_DELAY_MS));
}

/**
 * Replaces what is scheduled on the phone with the plan: cancels everything, then schedules each notification under
 * its id on its channel. With the permission not granted, it only cancels.
 *
 * @param notifications - The plan, as the server wrote it.
 * @returns The event FYIs it scheduled that the server asked to hear about (`acknowledge: true`), with the time each
 * was scheduled for; empty when the permission is not granted.
 */
export async function scheduleNotificationPlan(
  notifications: PlannedNotification[],
): Promise<NotificationAcknowledgeEvent[]> {
  await setUpNotificationChannels();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await notificationsAllowed())) return [];
  const scheduled: NotificationAcknowledgeEvent[] = [];
  for (const notification of notifications) {
    const date = scheduledTime(notification, Date.now());
    await Notifications.scheduleNotificationAsync({
      identifier: notification.id,
      content: notificationContent(notification),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: notification.channel },
    });
    if (notification.acknowledge) scheduled.push({ id: notification.id, at: date.toISOString() });
  }
  return scheduled;
}

/**
 * Tells the server which event FYIs the phone scheduled (`POST /api/notifications/acknowledge`), so it lists them at
 * that time from now on instead of as pending. Sends nothing for an empty list.
 *
 * @param events - The event FYIs scheduled, with their times.
 * @returns Once the server has stored them.
 * @throws When the request fails; the events stay pending and the next rebuild schedules them again.
 */
export async function acknowledgeScheduledEvents(events: NotificationAcknowledgeEvent[]): Promise<void> {
  if (events.length === 0) return;
  const body: NotificationAcknowledgeRequest = { events };
  await apiFetch<NotificationAcknowledgeResponse>('/api/notifications/acknowledge', { method: 'POST', body });
}

let running: Promise<void> | null = null;
let again = false;

/**
 * Fetches the plan, schedules it, then acknowledges the event FYIs it scheduled (none with the permission off, so
 * they wait for a later rebuild). A call while one runs makes that one run once more when it finishes instead of
 * overlapping it, so a cancel never lands between another rebuild's schedules. The fetch goes through the query
 * client, so an unreachable server raises the blocking prompt and a 401 signs out, as for any read.
 *
 * @returns Once the schedule matches the latest plan and its event FYIs are acknowledged.
 * @throws When the plan can't be fetched (what was scheduled before stays), or the acknowledgement fails (what was
 * just scheduled stays, and its event FYIs stay pending on the server).
 */
export function rebuildNotificationSchedule(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        const plan = await queryClient.fetchQuery({
          queryKey: queryKeys.notificationPlan,
          queryFn: fetchNotificationPlan,
          staleTime: 0,
        });
        await acknowledgeScheduledEvents(await scheduleNotificationPlan(plan.notifications));
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}

/**
 * Dev only: schedules one notification of the plan to fire soon, with its real channel, text and targets, under a
 * test id so the next rebuild cancels it.
 *
 * @param notification - The notification to try.
 * @param seconds - How long from now.
 * @returns Once it is scheduled.
 */
export async function fireNotificationSoon(notification: PlannedNotification, seconds: number): Promise<void> {
  await setUpNotificationChannels();
  await Notifications.scheduleNotificationAsync({
    identifier: `test:${notification.id}:${Date.now()}`,
    content: notificationContent(notification),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: notification.channel,
    },
  });
}
