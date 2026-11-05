import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useWatch } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { Alert, Icon, SelectField } from '@/components';
import type { RoomFieldProps } from '../types';
import { ViewRow } from './view-row';

/**
 * Add subtenant's Room group: the list of empty tenant rooms, then the picked room's rent and units, read-only. With
 * no empty room the list is disabled and a link opens Landlord & rooms, where one can be added.
 */
export function RoomField({ control, rooms, error }: RoomFieldProps) {
  const router = useRouter();
  const roomId = useWatch({ control, name: 'roomId' });
  const picked = rooms.find((room) => room.id === roomId);
  const noRoom = rooms.length === 0;

  return (
    <>
      <SelectField
        placeholder="Choose a room"
        options={rooms.map((room) => ({ label: room.name, value: room.id }))}
        fieldControlProps={{ control, name: 'roomId', label: 'Room', required: true, error, disabled: noRoom }}
      />
      {noRoom ? (
        <>
          <Alert variant="info" message="No empty rooms" />
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/household/landlord-rooms')}
            className="-my-2 min-h-12 flex-row items-center gap-1.5 self-start px-1"
          >
            <Text className="font-manrope-bold text-label text-primary">Open Landlord & rooms</Text>
            <Icon as={ChevronRight} size={16} className="text-primary" />
          </Pressable>
        </>
      ) : null}
      {picked ? (
        <View className="flex-row flex-wrap gap-x-3 gap-y-4">
          {picked.facts.map((fact) => (
            <ViewRow key={fact.label} row={fact} half />
          ))}
        </View>
      ) : null}
    </>
  );
}
