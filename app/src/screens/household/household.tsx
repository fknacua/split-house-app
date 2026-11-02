import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { UserPlus } from 'lucide-react-native';

import { Alert, Button, PageHeader, Screen, SkeletonBlock } from '@/components';
import { useHousehold, usePullToRefresh } from '@/hooks';
import { HouseholdSkeleton } from './components/household-skeleton';
import { LandlordCard } from './components/landlord-card';
import { MonthSelect } from './components/month-select';
import { PersonCard } from './components/person-card';
import { SplitSection } from './components/split-section';

/**
 * The Household tab: the setup for one month. Every string comes from `GET /api/household`; this
 * screen lays it out and switches the month. Picking a month redraws the skeleton until it arrives.
 * The View and edit buttons are drawn and do nothing until their forms are built.
 */
export function Household() {
  const [pickedMonth, setPickedMonth] = useState<string>();
  const { data, error, isPending, isPlaceholderData, refetch } = useHousehold(pickedMonth);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const loaded = isPlaceholderData ? undefined : data;

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
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerClassName="gap-4 px-4 pb-5 pt-1"
      >
        {isPending || isPlaceholderData ? <HouseholdSkeleton /> : null}
        {error ? <Alert variant="danger" message={error.message} /> : null}
        {loaded ? (
          <>
            <LandlordCard stats={loaded.landlord.stats} edit={loaded.landlord.edit} />
            <SplitSection rows={loaded.splitRows} />
            <View className="gap-2">
              <Text accessibilityRole="header" className="px-1 font-manrope-bold text-label text-on-surface">
                People
              </Text>
              {loaded.people.map((person) => (
                <PersonCard key={person.personId} person={person} />
              ))}
            </View>
            <Button label={loaded.addPerson.label} variant="outline" icon={UserPlus} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
