import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';

import { Alert, PageHeader, Screen, SkeletonBlock, SkeletonCard, SwipeTabs } from '@/components';
import { useHousehold, usePullToRefresh } from '@/hooks';
import type { HouseholdTarget } from '@splithouse/shared';
import { HouseholdSkeleton } from './components/household-skeleton';
import { LandlordCard } from './components/landlord-card';
import { MonthSelect } from './components/month-select';
import { PeopleSection } from './components/people-section';
import { RecurringSection } from './components/recurring-section';
import { SplitSection } from './components/split-section';
import type { HouseholdTab } from './types';

const TABS: readonly { label: string; value: HouseholdTab }[] = [
  { label: 'Split', value: 'split' },
  { label: 'People', value: 'people' },
  { label: 'Recurring', value: 'recurring' },
];

/**
 * The Household tab: the setup for one month. Every string from the server comes from `GET /api/household`; this
 * screen lays it out and switches the month, and `SwipeTabs` holds the tabs, with the landlord card scrolling away
 * above them. Picking a month redraws the skeleton until it arrives, and the tab stays as it was.
 * View, Edit, Add subtenant, the rent card and Edit splits open their screens.
 */
export function Household() {
  const router = useRouter();
  const [pickedMonth, setPickedMonth] = useState<string>();
  const { data, error, isPending, isPlaceholderData, refetch } = useHousehold(pickedMonth);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const loaded = isPlaceholderData ? undefined : data;
  const loading = isPending || isPlaceholderData;

  const openTarget = (target: HouseholdTarget) => {
    if (target.kind === 'view-person') {
      router.push({ pathname: '/household/person/[personId]', params: { personId: target.personId } });
    } else if (target.kind === 'edit-person') {
      router.push({ pathname: '/household/person/[personId]/edit', params: { personId: target.personId } });
    } else if (target.kind === 'add-person') {
      router.push('/household/add-person');
    } else if (target.kind === 'edit-home') {
      router.push('/household/landlord-rooms');
    } else if (target.kind === 'edit-splits') {
      router.push('/household/split');
    }
  };

  return (
    <Screen>
      <PageHeader
        title="Household"
        trailing={
          data ? (
            <MonthSelect
              options={data.monthOptions}
              month={pickedMonth ?? data.month}
              fallbackLabel={data.monthLabel}
              onChange={setPickedMonth}
            />
          ) : isPending ? (
            <View accessibilityElementsHidden className="h-11 flex-row items-center gap-1.5 px-2">
              <Text className="font-manrope-semibold text-label text-on-surface-variant">Showing:</Text>
              <SkeletonBlock className="h-3.5 w-16" />
            </View>
          ) : null
        }
      />
      <SwipeTabs
        tabs={TABS}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        header={
          <>
            {error ? <Alert variant="danger" message={error.message} /> : null}
            {loading ? <SkeletonCard className="h-40 rounded-dialog" /> : null}
            {loaded ? (
              <LandlordCard
                label={loaded.landlord.label}
                amount={loaded.landlord.amount}
                stats={loaded.landlord.stats}
                edit={loaded.landlord.edit}
                onOpen={openTarget}
              />
            ) : null}
          </>
        }
        renderTab={(tab) => (
          <>
            {loading ? <HouseholdSkeleton tab={tab} /> : null}
            {loaded && tab === 'split' ? (
              <SplitSection rows={loaded.splitRows} edit={loaded.editSplits} onOpen={openTarget} />
            ) : null}
            {loaded && tab === 'people' ? (
              <PeopleSection people={loaded.people} add={loaded.addPerson} onOpen={openTarget} />
            ) : null}
            {loaded && tab === 'recurring' ? <RecurringSection recurring={loaded.recurring} /> : null}
          </>
        )}
      />
    </Screen>
  );
}
