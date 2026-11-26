import { useEffect, useRef } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { Alert, PageHeader, Screen } from '@/components';
import { useNotificationsBlocked, usePullToRefresh, useSettings } from '@/hooks';
import { rebuildNotificationSchedule } from '@/lib/notifications';
import { AccountCard } from './components/account-card';
import { AppearanceSection } from './components/appearance-section';
import { MessagesSection } from './components/messages-section';
import { NotificationsSection } from './components/notifications-section';

/**
 * The Settings tab. The email, the Messages rows and the notification switches come from `GET /api/settings`;
 * Appearance is stored on the device, so it and Sign out still work while that loads or fails. The notification
 * permission is read again each time the app comes back to the foreground.
 */
export function Settings() {
  const { data, error, isPending, refetch } = useSettings();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const blocked = useNotificationsBlocked();

  // Allowed again in system settings: nothing was scheduled while blocked, so schedule the reminders now.
  const wasBlocked = useRef(blocked);
  useEffect(() => {
    if (wasBlocked.current === true && blocked === false) void rebuildNotificationSchedule().catch(() => {});
    wasBlocked.current = blocked;
  }, [blocked]);

  return (
    <Screen>
      <PageHeader title="Settings" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerClassName="gap-2 px-4 pb-5 pt-1"
      >
        {error ? <Alert variant="danger" message={error.message} /> : null}
        <AccountCard email={data?.email} loading={isPending} />
        <AppearanceSection />
        {error ? null : <MessagesSection rows={data?.messages} />}
        {error ? null : <NotificationsSection rows={data?.notifications} blocked={blocked} />}
      </ScrollView>
    </Screen>
  );
}
