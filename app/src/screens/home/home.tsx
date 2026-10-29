import { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Alert, PageHeader, Screen } from '@/components';
import { useHome, usePullToRefresh } from '@/hooks';
import { HomeCharges } from './components/home-charges';
import { HomeCompactSummary } from './components/home-compact-summary';
import { HomeFooter } from './components/home-footer';
import { HomeHeaderSkeleton } from './components/home-header-skeleton';
import { HomeHero } from './components/home-hero';
import { HomeNextMonthFooter } from './components/home-next-month-footer';
import { HomeSkeleton } from './components/home-skeleton';
import { HomeSheetsProvider } from './home-sheets';

// How far the hero scrolls before the compact summary pins under the header.
const COMPACT_AFTER_PX = 140;

/**
 * The Home tab: the newest opened month. Every string comes from `GET /api/home`; this screen only
 * lays it out and opens what a tap points at.
 */
export function Home() {
  const { data, error, isPending, refetch } = useHome();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const [compact, setCompact] = useState(false);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCompact(event.nativeEvent.contentOffset.y > COMPACT_AFTER_PX);
  };

  return (
    <HomeSheetsProvider>
      <Screen>
        {data ? <PageHeader title={data.monthName} /> : <HomeHeaderSkeleton />}
        <View className="relative min-h-0 flex-1">
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerClassName="gap-4 px-4 pb-5 pt-1"
          >
            {isPending ? <HomeSkeleton /> : null}
            {error ? <Alert variant="danger" message={error.message} /> : null}
            {data ? (
              <>
                <HomeHero hero={data.hero} />
                <HomeCharges rows={data.rows} />
              </>
            ) : null}
          </ScrollView>
          {data && compact ? <HomeCompactSummary hero={data.hero} /> : null}
        </View>
        {data?.primaryAction ? <HomeFooter action={data.primaryAction} /> : null}
        {data?.nextMonthAction ? <HomeNextMonthFooter action={data.nextMonthAction} /> : null}
      </Screen>
    </HomeSheetsProvider>
  );
}
