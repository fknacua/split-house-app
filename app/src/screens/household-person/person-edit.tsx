import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Alert, Screen, SubpageHeader } from '@/components';
import { useHouseholdForm } from '@/hooks';
import { ApiRequestError } from '@/lib/api';
import type { HouseholdFormResponse } from '@splithouse/shared';
import { PersonForm } from './components/person-form';
import { PersonSkeleton } from './components/person-skeleton';

/**
 * A person's Edit screen, opened on an upcoming month (`month`) or, without one, the first Starts from
 * option. Loads the form, then holds on to the newest response while another Starts from month loads, so
 * the form stays mounted and keeps what was typed.
 */
export function PersonEdit() {
  const params = useLocalSearchParams<{ personId: string; month?: string }>();
  const [pickedMonth, setPickedMonth] = useState(params.month);
  const query = useHouseholdForm(params.personId, pickedMonth);
  const fresh = query.isPlaceholderData ? undefined : query.data;
  const [form, setForm] = useState<HouseholdFormResponse>();
  if (fresh && fresh !== form) setForm(fresh);
  const errorMessage = query.error instanceof ApiRequestError ? query.error.message : null;

  if (!form) {
    return (
      <Screen>
        <SubpageHeader title="Household" loading={query.isPending} />
        {errorMessage ? (
          <View className="px-4 pt-2">
            <Alert variant="danger" message={errorMessage} />
          </View>
        ) : query.isPending ? (
          <PersonSkeleton />
        ) : null}
      </Screen>
    );
  }

  return (
    <PersonForm
      form={form}
      month={pickedMonth ?? form.startsFrom}
      onMonthChange={setPickedMonth}
      monthLoaded={!!fresh}
      monthError={errorMessage}
    />
  );
}
