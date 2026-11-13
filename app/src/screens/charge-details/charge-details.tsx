import { useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';

import { Alert, Screen, SkeletonBlock, SubpageFooter, SubpageHeader } from '@/components';
import { useChargeDetails } from '@/hooks';
import { ActivityCard } from './components/activity-card';
import { AmountCard } from './components/amount-card';
import { ChargeDetailsFooter } from './components/charge-details-footer';
import { ChargeDetailsSkeleton } from './components/charge-details-skeleton';
import { DetailsCard } from './components/details-card';
import { Section } from './components/section';

/**
 * Charge details: one charge's amount and chip, its Details, its Activity, and Nudge and Mark paid
 * when the server sends them. Every string comes from `GET /api/charges/:id/details`. Opened from a
 * Home row's View details, so the bottom navigation is hidden. A save or a nudge refetches it in
 * place (`allChargeDetails`).
 */
export function ChargeDetails() {
  const { chargeId } = useLocalSearchParams<{ chargeId: string }>();
  const { data, error, isPending } = useChargeDetails(chargeId);

  return (
    <Screen>
      <SubpageHeader title={data?.title ?? ''} subtitle={data?.monthName} loading={isPending} />
      <ScrollView contentContainerClassName="gap-3 px-4 pb-4 pt-1">
        {isPending ? <ChargeDetailsSkeleton /> : null}
        {error ? <Alert variant="danger" message={error.message} /> : null}
        {data ? (
          <>
            <Section title="Amount">
              <AmountCard amount={data.amount} />
            </Section>
            <Section title="Details">
              <DetailsCard facts={data.facts} />
            </Section>
            <Section title="Activity">
              <ActivityCard activity={data.activity} />
            </Section>
          </>
        ) : null}
      </ScrollView>
      {isPending ? (
        <SubpageFooter>
          <SkeletonBlock className="h-12 rounded-full" />
        </SubpageFooter>
      ) : null}
      {data && data.footer.length > 0 ? <ChargeDetailsFooter actions={data.footer} /> : null}
    </Screen>
  );
}
