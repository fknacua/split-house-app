import { RefreshControl, ScrollView } from 'react-native';

import { Alert, PageHeader, Screen } from '@/components';
import { usePullToRefresh, useSettings } from '@/hooks';
import { AccountCard } from './components/account-card';
import { AppearanceSection } from './components/appearance-section';
import { MessagesSection } from './components/messages-section';

/**
 * The Settings tab. The email and the Messages rows come from `GET /api/settings`; Appearance is stored on the
 * device, so it and Sign out still work while that loads or fails.
 */
export function Settings() {
  const { data, error, isPending, refetch } = useSettings();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

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
      </ScrollView>
    </Screen>
  );
}
