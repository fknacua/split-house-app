import { useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { ScrollView } from 'react-native';

import { Alert, Button, Screen, SkeletonBlock, SubpageFooter, SubpageHeader, type AppSheetRef } from '@/components';
import { useBill } from '@/hooks';
import { PayBillSheet } from '@/sheets/pay-bill';
import { formatMonthLabel, isValidMonthKey } from '@splithouse/shared';
import { BillHeroCard } from './components/bill-hero-card';
import { BillSkeleton } from './components/bill-skeleton';
import { CollectionCard } from './components/collection-card';
import { FactsCard } from './components/facts-card';
import { FileRow } from './components/file-row';

/**
 * View bill, read-only: Current Charges and its lines, how much is collected with each person's
 * share, the facts, the stored PDF and, while collecting, Mark bill paid, which opens its sheet.
 * Every string comes from `GET /api/months/:month/bill`. Opened from Home and from a History
 * month, so the bottom navigation is hidden.
 */
export function Bill() {
  const { month } = useLocalSearchParams<{ month: string }>();
  const { data, error, isPending } = useBill(month);
  const payBill = useRef<AppSheetRef>(null);

  return (
    <Screen>
      <SubpageHeader
        title="Utilities bill"
        subtitle={data?.monthName ?? (isValidMonthKey(month) ? formatMonthLabel(month) : undefined)}
      />
      <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-2">
        {isPending ? <BillSkeleton /> : null}
        {error ? <Alert variant="danger" message={error.message} /> : null}
        {data ? (
          <>
            <BillHeroCard hero={data.hero} />
            <CollectionCard collection={data.collection} />
            <FactsCard facts={data.facts} />
            {data.file ? <FileRow month={data.month} file={data.file} /> : null}
          </>
        ) : null}
      </ScrollView>
      {isPending ? (
        <SubpageFooter>
          <SkeletonBlock className="h-12 rounded-full" />
        </SubpageFooter>
      ) : null}
      {data?.action ? (
        <SubpageFooter>
          <Button label={data.action.label} onPress={() => payBill.current?.open()} />
        </SubpageFooter>
      ) : null}
      <PayBillSheet ref={payBill} month={month} />
    </Screen>
  );
}
