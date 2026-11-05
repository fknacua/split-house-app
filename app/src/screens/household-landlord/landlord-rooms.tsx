import { View } from 'react-native';

import { Alert, Screen, SubpageHeader } from '@/components';
import { useHouseholdHomeForm } from '@/hooks';
import { ApiRequestError } from '@/lib/api';
import { LandlordRoomsForm } from './components/landlord-rooms-form';
import { LandlordRoomsSkeleton } from './components/landlord-rooms-skeleton';

/**
 * The Landlord & rooms screen: loads the latest saved values, which fill the form.
 */
export function LandlordRooms() {
  const { data, error, isPending } = useHouseholdHomeForm();

  if (!data) {
    return (
      <Screen>
        <SubpageHeader title="Landlord & rooms" loading={isPending} />
        {error instanceof ApiRequestError ? (
          <View className="px-4 pt-2">
            <Alert variant="danger" message={error.message} />
          </View>
        ) : isPending ? (
          <LandlordRoomsSkeleton />
        ) : null}
      </Screen>
    );
  }

  return <LandlordRoomsForm form={data} />;
}
