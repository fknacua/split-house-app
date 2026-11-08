import { View } from 'react-native';

import { Alert, Screen, SubpageHeader } from '@/components';
import { useBootstrap, useHouseholdAddForm } from '@/hooks';
import { ApiRequestError } from '@/lib/api';
import { AddPersonForm } from './components/add-person-form';
import { PersonSkeleton } from './components/person-skeleton';

/**
 * The Add subtenant screen, or Add person in First run: loads the default color and the lists, then shows the empty
 * form.
 */
export function AddPerson() {
  const { data, error, isPending } = useHouseholdAddForm();
  const setupComplete = useBootstrap().data?.setupComplete ?? true;

  if (!data) {
    return (
      <Screen>
        <SubpageHeader title={setupComplete ? 'Add subtenant' : 'Add person'} loading={isPending} />
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

  return <AddPersonForm form={data} />;
}
