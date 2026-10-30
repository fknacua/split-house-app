import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Alert, Card, EmptyBox, Screen, SkeletonBlock, SubpageFooter, SubpageHeader } from '@/components';
import { useRecipient } from '@/hooks';
import { AmountCard } from './components/amount-card';
import { ChargeRowsCard } from './components/charge-rows-card';
import { MessageCard } from './components/message-card';
import { RecipientFooter } from './components/recipient-footer';
import { RecipientSkeleton } from './components/recipient-skeleton';
import { RecipientSheetsProvider } from './recipient-sheets';

/**
 * Recipient: one person's month, what they owe, the message they get and the buttons to send it.
 * Every string comes from `GET /api/months/:month/recipients/:personId`: `notSent`, `sent`, the
 * overdue layout (`nudged`, with the charge rows), the paid layouts (`paid`, `paidDifferent`), where
 * a box stands in for the message, and loading. Home's Nudge passes `chargeId` to choose the charge
 * to nudge. Opened from Home, so the bottom navigation is hidden. Mounts its own sheets (Record
 * payment, Nudge about which charge?, Edit payment).
 */
export function Recipient() {
  const { month, personId, chargeId } = useLocalSearchParams<{ month: string; personId: string; chargeId?: string }>();
  const { data, error, isPending } = useRecipient(month, personId, chargeId ?? null);

  return (
    <RecipientSheetsProvider>
      <Screen>
        <SubpageHeader title={data?.header.name ?? ''} subtitle={data?.header.sub} loading={isPending} />
        <ScrollView contentContainerClassName="gap-3 px-4 pb-4 pt-1">
          {isPending ? <RecipientSkeleton /> : null}
          {error ? <Alert variant="danger" message={error.message} /> : null}
          {data ? (
            <>
              <AmountCard card={data.amountCard} />
              {data.charges.length > 0 ? <ChargeRowsCard rows={data.charges} /> : null}
              {data.message ? <MessageCard message={data.message} /> : null}
              {data.allPaid ? (
                <Card>
                  <EmptyBox title={data.allPaid.title} note={data.allPaid.note} />
                </Card>
              ) : null}
            </>
          ) : null}
        </ScrollView>
        {isPending ? (
          <SubpageFooter>
            <View className="gap-2">
              <SkeletonBlock className="h-12 rounded-full" />
              <SkeletonBlock className="h-12 rounded-full" />
            </View>
          </SubpageFooter>
        ) : null}
        {data ? (
          <RecipientFooter
            note={data.note}
            primary={data.primaryAction}
            secondary={data.secondaryActions}
            charges={data.charges}
          />
        ) : null}
      </Screen>
    </RecipientSheetsProvider>
  );
}
