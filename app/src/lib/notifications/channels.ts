import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationChannel } from '@splithouse/shared';

/** One Android channel: the name Android shows in the app's notification settings, and how loud it is. */
interface ChannelSetup {
  name: string;
  importance: Notifications.AndroidImportance;
}

/**
 * The three channels, by the plan's channel ids. Action needed pops up as a heads-up; Payment checks makes a sound
 * without popping up; FYI is silent and only sits in the shade.
 */
export const NOTIFICATION_CHANNELS: Readonly<Record<NotificationChannel, ChannelSetup>> = {
  action: { name: 'Action needed', importance: Notifications.AndroidImportance.HIGH },
  checks: { name: 'Payment checks', importance: Notifications.AndroidImportance.DEFAULT },
  fyi: { name: 'FYI', importance: Notifications.AndroidImportance.LOW },
};

/** The category of a notification with Paid and Nudge buttons (Collect rent, Payment checks). */
export const PAID_NUDGE_CATEGORY = 'paid-nudge';

/**
 * Registers the Paid and Nudge buttons. The category is shared; each button's target comes from the pressed
 * notification's own `data.actions`. Both buttons bring the app to the foreground and send or mark nothing.
 *
 * @returns Once the category is registered.
 */
export async function setUpNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(PAID_NUDGE_CATEGORY, [
    { identifier: 'paid', buttonTitle: 'Paid', options: { opensAppToForeground: true } },
    { identifier: 'nudge', buttonTitle: 'Nudge', options: { opensAppToForeground: true } },
  ]);
}

/**
 * Creates the three channels, or updates their names. Android keeps a channel's importance once it exists, so
 * changing it means a new channel id. Safe to call on every launch. Android 13 and later needs a channel before it
 * shows the permission dialog. Also registers the action-button category.
 *
 * @returns Once every channel and the category are set.
 */
export async function setUpNotificationChannels(): Promise<void> {
  await setUpNotificationCategories();
  if (Platform.OS !== 'android') return;
  await Promise.all(
    Object.entries(NOTIFICATION_CHANNELS).map(([id, channel]) =>
      Notifications.setNotificationChannelAsync(id, {
        name: channel.name,
        importance: channel.importance,
        ...(channel.importance <= Notifications.AndroidImportance.LOW ? { sound: null, enableVibrate: false } : {}),
      }),
    ),
  );
}

/**
 * Shows a reminder that arrives while the app is open, as it would show with the app closed: in the shade, and as a
 * heads-up with sound unless it is FYI. Call once, at import time of the root layout.
 */
export function showNotificationsInForeground(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const silent = notification.request.content.data?.channel === 'fyi';
      return { shouldShowBanner: !silent, shouldShowList: true, shouldPlaySound: !silent, shouldSetBadge: false };
    },
  });
}
