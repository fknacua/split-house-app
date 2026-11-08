import { View } from 'react-native';

import { Alert, Screen, SubpageHeader } from '@/components';
import { useSetupMessages } from '@/hooks';
import { MessagesSkeleton } from '@/screens/settings/components/messages-skeleton';
import { MessagesPage } from './components/messages-page';

/**
 * First run's Custom messages page (`FirstRunMessages.dc.html`): loads from `GET /api/setup/messages`. A template
 * saved or removed on the landing page refreshes it, since template saves refetch `allHousehold`.
 */
export function SetupMessages() {
  const { data, error, isPending } = useSetupMessages();

  if (!data) {
    return (
      <Screen>
        <SubpageHeader title="Custom messages" subtitle="Optional" />
        <View className="px-4 pt-2">
          {error ? <Alert variant="danger" message={error.message} /> : isPending ? <MessagesSkeleton /> : null}
        </View>
      </Screen>
    );
  }

  return <MessagesPage page={data} />;
}
