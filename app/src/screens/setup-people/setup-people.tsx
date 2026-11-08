import { View } from 'react-native';

import { Alert, Screen, SubpageHeader } from '@/components';
import { useSetupPeople } from '@/hooks';
import { PeopleForm } from './components/people-form';
import { PeopleSkeleton } from './components/people-skeleton';

/**
 * First run's People page (`FirstRunPeople.dc.html`): loads the cards from `GET /api/setup/people`. An added, edited
 * or removed person refreshes it, since every first-setup save refetches the setup queries.
 */
export function SetupPeople() {
  const { data, error, isPending } = useSetupPeople();

  if (!data) {
    return (
      <Screen>
        <SubpageHeader title="People" subtitle="Who pays you" />
        {error ? (
          <View className="px-4 pt-2">
            <Alert variant="danger" message={error.message} />
          </View>
        ) : isPending ? (
          <PeopleSkeleton />
        ) : null}
      </Screen>
    );
  }

  return <PeopleForm page={data} />;
}
