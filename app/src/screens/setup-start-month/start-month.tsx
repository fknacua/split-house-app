import { View } from 'react-native';

import { Alert, Screen, SubpageHeader } from '@/components';
import { useSetupStartMonth } from '@/hooks';
import { StartMonthForm } from './components/start-month-form';
import { StartMonthSkeleton } from './components/start-month-skeleton';

/**
 * First run's Start month page (`FirstRunStart.dc.html`): loads the cards from `GET /api/setup/start-month`, which
 * fill the form.
 */
export function StartMonth() {
  const { data, error, isPending } = useSetupStartMonth();

  if (!data) {
    return (
      <Screen>
        <SubpageHeader title="Start month" subtitle="When tracking begins" />
        {error ? (
          <View className="px-4 pt-2">
            <Alert variant="danger" message={error.message} />
          </View>
        ) : isPending ? (
          <StartMonthSkeleton />
        ) : null}
      </Screen>
    );
  }

  return <StartMonthForm page={data} />;
}
