import { useWatch } from 'react-hook-form';

import { Alert, SelectField } from '@/components';
import type { RoomFieldProps } from '../types';
import { LandlordRoomsLink } from './landlord-rooms-link';
import { RoomFacts } from './room-facts';

/**
 * Add subtenant's Room group: the list of empty tenant rooms, then the picked room's rent and units, read-only. With
 * no empty room the list is disabled and a link opens Landlord & rooms, where one can be added.
 */
export function RoomField({ control, rooms, error }: RoomFieldProps) {
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
          <LandlordRoomsLink label="Open Landlord & rooms" />
        </>
      ) : null}
      {picked ? <RoomFacts facts={picked.facts} /> : null}
    </>
  );
}
