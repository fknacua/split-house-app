import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Alert, Screen, SubpageHeader } from '@/components';
import { useHouseholdForm } from '@/hooks';
import { ApiRequestError } from '@/lib/api';
import { PersonForm } from './components/person-form';
import { PersonSkeleton } from './components/person-skeleton';

/**
 * A person's Edit screen: loads their latest saved values, which fill the form.
 */
export function PersonEdit() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { data, error, isPending } = useHouseholdForm(personId);

  if (!data) {
    return (
      <Screen>
        <SubpageHeader title="Household" loading={isPending} />
        {error instanceof ApiRequestError ? (
          <View className="px-4 pt-2">
            <Alert variant="danger" message={error.message} />
          </View>
        ) : isPending ? (
          <PersonSkeleton />
        ) : null}
      </Screen>
    );
  }

  return <PersonForm form={data} />;
}
