import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { formatDateShort, type PlannedNotification } from '@splithouse/shared';

import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import {
  fetchNotificationPlan,
  fireNotificationSoon,
  NOTIFICATION_CHANNELS,
  rebuildNotificationSchedule,
} from '@/lib/notifications';
import { queryKeys } from '@/lib/query-keys';

/** How long after a tap a test notification fires, and the gap between them when firing one of each. */
const FIRE_AFTER_SECONDS = 5;

/** A plan time, `2026-11-30T09:00:00+08:00`, as `30 Nov 09:00` (Singapore). */
function formatPlanTime(at: string): string {
  return `${formatDateShort(at.slice(0, 10))} ${at.slice(11, 16)}`;
}

/** What kind of reminder an id is: the part before the first colon (`upload`, `rent`, `pay-bill`, `check`). */
function kindOf(notification: PlannedNotification): string {
  return notification.id.split(':')[0];
}

/** When a scheduled request fires, as far as the trigger tells. */
function scheduledTime(trigger: Notifications.NotificationTrigger | null): string {
  const value = (trigger as { value?: unknown } | null)?.value;
  if (typeof value === 'number') {
    return new Date(value).toLocaleString('en-SG', {
      timeZone: 'Asia/Singapore',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  return (trigger as { type?: string } | null)?.type ?? 'unknown trigger';
}

/** The permission as one line: granted, denied, or never asked. */
function permissionText(status: Notifications.NotificationPermissionsStatus | null): string {
  if (!status) return 'checking…';
  if (status.granted) return 'granted';
  if (status.status === 'undetermined' && status.canAskAgain) return 'never asked';
  return 'denied (only system settings can change it)';
}

/** One notification of the plan, with a button that fires it soon. */
function PlanRow({ notification, more, onFire }: { notification: PlannedNotification; more: number; onFire: () => void }) {
  return (
    <Card className="gap-1">
      <Text className="font-manrope-bold text-label text-on-surface">{notification.title}</Text>
      <Text className="font-manrope-medium text-caption text-on-surface-variant">{notification.body}</Text>
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        {NOTIFICATION_CHANNELS[notification.channel].name} · {formatPlanTime(notification.at)}
        {notification.actions.length > 0 ? ' · Paid, Nudge' : ''}
        {more > 0 ? ` · ${more} more like it` : ''}
      </Text>
      <Button size="small" variant="outline" label={`Fire in ${FIRE_AFTER_SECONDS}s`} onPress={onFire} />
    </Card>
  );
}

/**
 * Dev-only test page panel for notifications: the permission, the real plan from the server with a button per
 * notification that fires it in 5 seconds on its real channel with its real text and targets, one of each kind, a
 * rebuild, and what the phone has scheduled. Only Android's own delay overnight needs the real wait (14.8).
 */
export function NotificationsTestPanel() {
  const [permission, setPermission] = useState<Notifications.NotificationPermissionsStatus | null>(null);
  const [loadPlan, setLoadPlan] = useState(false);
  const [scheduled, setScheduled] = useState<Notifications.NotificationRequest[] | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const plan = useQuery({
    queryKey: queryKeys.notificationPlan,
    queryFn: fetchNotificationPlan,
    enabled: loadPlan,
    staleTime: 0,
  });

  const checkPermission = useCallback(async () => {
    setPermission(await Notifications.getPermissionsAsync());
  }, []);

  // Re-checks when the app comes back from system settings.
  useEffect(() => {
    const check = () => void Notifications.getPermissionsAsync().then(setPermission);
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => subscription.remove();
  }, []);

  /** Runs one action, showing what it did or why it failed. */
  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    try {
      setMessage({ ok: true, text: await action() });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
      void checkPermission();
    }
  };

  const ask = () =>
    run(async () => {
      const status = await Notifications.requestPermissionsAsync();
      return `Permission: ${permissionText(status)}.`;
    });

  const fire = (notification: PlannedNotification, seconds = FIRE_AFTER_SECONDS) =>
    run(async () => {
      await fireNotificationSoon(notification, seconds);
      return `“${notification.title}” fires in ${seconds}s.`;
    });

  const fireOneOfEach = () =>
    run(async () => {
      const kinds = new Map<string, PlannedNotification>();
      for (const notification of plan.data?.notifications ?? []) {
        if (!kinds.has(kindOf(notification))) kinds.set(kindOf(notification), notification);
      }
      const picked = [...kinds.values()];
      for (const [i, notification] of picked.entries()) {
        await fireNotificationSoon(notification, FIRE_AFTER_SECONDS * (i + 1));
      }
      return `${picked.length} fire ${FIRE_AFTER_SECONDS}s apart: ${[...kinds.keys()].join(', ') || 'none in the plan'}.`;
    });

  const rebuild = () =>
    run(async () => {
      await rebuildNotificationSchedule();
      const count = (await Notifications.getAllScheduledNotificationsAsync()).length;
      return `Rebuilt: ${count} scheduled.`;
    });

  const showScheduled = () =>
    run(async () => {
      const requests = await Notifications.getAllScheduledNotificationsAsync();
      setScheduled(requests);
      return `${requests.length} scheduled.`;
    });

  const cancelAll = () =>
    run(async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setScheduled([]);
      return 'Cancelled everything scheduled. The next write or launch schedules the plan again.';
    });

  // Every notification but the daily upload reminders, which show as one row with a count.
  const notifications = plan.data?.notifications ?? [];
  const uploads = notifications.filter((n) => kindOf(n) === 'upload');
  const rows = [...uploads.slice(0, 1), ...notifications.filter((n) => kindOf(n) !== 'upload')];

  return (
    <View className="gap-3">
      <Text className="font-manrope-bold text-sheet-title text-on-surface">Notifications</Text>
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        Permission: {permissionText(permission)}. Test notifications fire with the real channel, text, tap and
        buttons; a rebuild cancels any still waiting.
      </Text>
      <Button label="Ask for permission" variant="outline" onPress={() => void ask()} disabled={busy} />
      <Button
        label="Open system settings"
        variant="ghost"
        size="small"
        onPress={() => void Linking.openSettings()}
      />

      <Button
        label={loadPlan ? 'Reload the plan' : 'Load the plan'}
        variant="outline"
        loading={plan.isFetching}
        onPress={() => (loadPlan ? void plan.refetch() : setLoadPlan(true))}
      />
      {plan.isError ? <Alert variant="danger" title="Couldn’t load the plan" message={plan.error.message} /> : null}
      {plan.data ? (
        <Text className="font-manrope-medium text-caption text-on-surface-variant">
          {notifications.length} in the plan, for the next 14 days.
        </Text>
      ) : null}
      {rows.map((notification) => (
        <PlanRow
          key={notification.id}
          notification={notification}
          more={kindOf(notification) === 'upload' ? uploads.length - 1 : 0}
          onFire={() => void fire(notification)}
        />
      ))}
      {plan.data ? (
        <Button
          label={`Fire one of each, ${FIRE_AFTER_SECONDS}s apart`}
          onPress={() => void fireOneOfEach()}
          disabled={busy || notifications.length === 0}
        />
      ) : null}

      <Button label="Rebuild the schedule now" variant="outline" onPress={() => void rebuild()} disabled={busy} />
      <Button label="Show what’s scheduled" variant="outline" onPress={() => void showScheduled()} disabled={busy} />
      {scheduled?.map((request) => (
        <Text key={request.identifier} className="font-manrope-medium text-caption text-on-surface-variant">
          {scheduledTime(request.trigger)} · {request.content.title} ({request.identifier})
        </Text>
      ))}
      <Button label="Cancel everything scheduled" variant="danger" onPress={() => void cancelAll()} disabled={busy} />

      {message ? (
        <Alert variant={message.ok ? 'success' : 'danger'} message={message.text} />
      ) : null}
    </View>
  );
}
