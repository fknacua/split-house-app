import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { Alert, Screen, SubpageHeader } from '@/components';
import {
  useMarkSetupStep,
  useNotificationPermission,
  useSaveNotificationSwitch,
  useSettings,
  useSkipSetupStep,
} from '@/hooks';
import { askForNotifications, type NotificationPermission } from '@/lib/notifications';
import { NotificationsSkeleton } from '@/screens/settings/components/notifications-skeleton';
import { RemindersCard } from './components/reminders-card';
import { RemindersFooter } from './components/reminders-footer';

/** The note under the card, by permission, as `FirstRunReminders.dc.html` draws it. */
const HELPER: Record<NotificationPermission, string> = {
  undetermined: 'Turn these on after you allow notifications for this app.',
  granted: 'You can change these any time in Settings.',
  denied: 'Notifications are for this device only',
};

/**
 * First run's Reminders page (`FirstRunReminders.dc.html`: `default`, `prompt`, `granted`, `denied`). The switches come
 * from `GET /api/settings` and save as on Settings; the page's state is the phone's permission, which the server can't
 * see, read again on every return to the foreground. `Allow notifications` shows the real OS dialog (`prompt`). `Done`
 * marks the step; `Not now` and the blocked `Continue` skip it (R5). All three go back to Welcome, which counts the
 * step done.
 */
export function SetupReminders() {
  const router = useRouter();
  const { data, error } = useSettings();
  const { permission, setPermission } = useNotificationPermission();
  const save = useSaveNotificationSwitch();
  const mark = useMarkSetupStep();
  const skip = useSkipSetupStep();
  const [asking, setAsking] = useState(false);

  const allow = () => {
    setAsking(true);
    askForNotifications()
      .then(setPermission)
      // A failed ask leaves the page as it was; the next foreground reads the permission again.
      .catch(() => {})
      .finally(() => setAsking(false));
  };
  const leave = () => router.back();
  const failed = mark.error ?? skip.error;

  return (
    <Screen>
      <SubpageHeader title="Reminders" subtitle="Optional" />
      <ScrollView contentContainerClassName="gap-4 px-4 pb-4 pt-2">
        {error ? <Alert variant="danger" message={error.message} /> : null}
        {data && permission ? (
          <RemindersCard
            rows={data.notifications}
            permission={permission}
            onChange={(group, on) => save.mutate({ group, on })}
          />
        ) : error ? null : (
          <NotificationsSkeleton />
        )}
        {permission ? (
          <Text className="mx-1 font-manrope-semibold text-caption text-on-surface-variant">{HELPER[permission]}</Text>
        ) : null}
      </ScrollView>
      {permission ? (
        <RemindersFooter
          permission={permission}
          asking={asking}
          pending={mark.isPending ? 'mark' : skip.isPending ? 'skip' : null}
          error={failed?.message ?? null}
          onAllow={allow}
          onDone={() => mark.mutate('reminders', { onSuccess: leave })}
          onSkip={() => skip.mutate('reminders', { onSuccess: leave })}
        />
      ) : null}
    </Screen>
  );
}
