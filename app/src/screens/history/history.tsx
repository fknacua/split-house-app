import { RefreshControl, ScrollView } from 'react-native';

import { Alert, PageHeader, Screen } from '@/components';
import { useHistory, usePullToRefresh } from '@/hooks';
import { HistoryGroupSection } from './components/history-group-section';
import { HistorySkeleton } from './components/history-skeleton';

/**
 * The History tab: past months grouped by year, newest first. Every string comes from
 * `GET /api/history`; this screen only lays it out and opens a month.
 */
export function History() {
  const { data, error, isPending, refetch } = useHistory();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  return (
    <Screen>
      <PageHeader title="History" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerClassName="gap-2 px-4 pb-5 pt-1"
      >
        {isPending ? <HistorySkeleton /> : null}
        {error ? <Alert variant="danger" message={error.message} /> : null}
        {data?.groups.map((group) => (
          <HistoryGroupSection key={group.year} group={group} />
        ))}
      </ScrollView>
    </Screen>
  );
}
