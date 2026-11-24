import * as Notifications from 'expo-notifications';
import type { NotificationPlanResponse, PlannedNotification } from '@splithouse/shared';

import { apiFetch } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { setUpNotificationChannels } from './channels';

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
  return { title: notification.title, body: notification.body, data };
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

/**
 * Replaces what is scheduled on the phone with the plan: cancels everything, then schedules each notification under
 * its id on its channel. With the permission not granted, it only cancels.
 *
 * @param notifications - The plan, as the server wrote it.
 * @returns Once everything is scheduled.
 */
export async function scheduleNotificationPlan(notifications: PlannedNotification[]): Promise<void> {
  await setUpNotificationChannels();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await notificationsAllowed())) return;
  for (const notification of notifications) {
    await Notifications.scheduleNotificationAsync({
      identifier: notification.id,
      content: notificationContent(notification),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(notification.at),
        channelId: notification.channel,
      },
    });
  }
}

let running: Promise<void> | null = null;
let again = false;

/**
 * Fetches the plan and schedules it. A call while one runs makes that one run once more when it finishes instead of
 * overlapping it, so a cancel never lands between another rebuild's schedules. The fetch goes through the query
 * client, so an unreachable server raises the blocking prompt and a 401 signs out, as for any read.
 *
 * @returns Once the schedule matches the latest plan.
 * @throws When the plan can't be fetched; what was scheduled before stays.
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
        await scheduleNotificationPlan(plan.notifications);
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
