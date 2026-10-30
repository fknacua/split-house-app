import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Alert, Screen, SkeletonBlock, SubpageFooter, SubpageHeader } from '@/components';
import { useRecipient } from '@/hooks';
import { AmountCard } from './components/amount-card';
import { MessageCard } from './components/message-card';
import { RecipientFooter } from './components/recipient-footer';
import { RecipientSkeleton } from './components/recipient-skeleton';
import { RecipientSheetsProvider } from './recipient-sheets';

/**
 * Recipient: one person's month, what they owe, the message they get and the buttons to send it.
 * Every string comes from `GET /api/months/:month/recipients/:personId`. Built so far: `notSent`,
 * `sent` and loading. Opened from Home, so the bottom navigation is hidden. Mounts its own sheets
 * (Record payment).
 */
export function Recipient() {
  const { month, personId } = useLocalSearchParams<{ month: string; personId: string }>();
  const { data, error, isPending } = useRecipient(month, personId);

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
              <MessageCard message={data.message} />
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
          <RecipientFooter note={data.note} primary={data.primaryAction} secondary={data.secondaryActions} />
        ) : null}
      </Screen>
    </RecipientSheetsProvider>
  );
}
