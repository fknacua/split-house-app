import { View } from 'react-native';

import { Alert, Screen, SubpageHeader } from '@/components';
import { useHouseholdSplitForm } from '@/hooks';
import { ApiRequestError } from '@/lib/api';
import { SplitForm } from './components/split-form';
import { SplitSkeleton } from './components/split-skeleton';

/**
 * The Household split screen: loads the latest saved values, which fill the form.
 */
export function HouseholdSplit() {
  const { data, error, isPending } = useHouseholdSplitForm();

  if (!data) {
    return (
      <Screen>
        <SubpageHeader title="Household split" loading={isPending} />
        {error instanceof ApiRequestError ? (
          <View className="px-4 pt-2">
            <Alert variant="danger" message={error.message} />
          </View>
        ) : isPending ? (
          <SplitSkeleton />
        ) : null}
      </Screen>
    );
  }

  return <SplitForm form={data} />;
}
