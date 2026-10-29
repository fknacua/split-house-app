import { useLocalSearchParams } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';

import { Alert, Card, Screen, SubpageHeader } from '@/components';
import { useHistoryMonth } from '@/hooks';
import { BillCard } from './components/bill-card';
import { MonthSkeleton } from './components/month-skeleton';
import { PaymentRow } from './components/payment-row';

/**
 * One past month, read-only: banners for later corrections, the utilities bill card and the
 * payments. Every string comes from `GET /api/history/:month`. Opened from the History list, so
 * the bottom navigation is hidden.
 */
export function HistoryMonth() {
  const { month } = useLocalSearchParams<{ month: string }>();
  const { data, error, isPending } = useHistoryMonth(month);

  return (
    <Screen>
      <SubpageHeader
        title={data?.name}
        loading={isPending}
        subtitle="Read-only"
        subtitleIcon={Lock}
        backLabel="Back to History"
      />
      <ScrollView contentContainerClassName="gap-3.5 px-4 pb-6 pt-1">
        {isPending ? <MonthSkeleton /> : null}
        {error ? <Alert variant="danger" message={error.message} /> : null}
        {data ? (
          <>
            {data.banners.map((banner) => (
              <Alert
                key={banner.title + banner.text}
                variant={banner.tone}
                title={banner.title}
                message={banner.text}
              />
            ))}
            <BillCard month={data.month} bill={data.bill} />
            <View className="gap-1.5">
              <Text className="mx-1 font-manrope-bold text-body text-on-surface">Payments</Text>
              <Card padded={false}>
                {data.payments.map((payment, i) => (
                  <PaymentRow key={payment.title + i} payment={payment} separated={i > 0} />
                ))}
              </Card>
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
