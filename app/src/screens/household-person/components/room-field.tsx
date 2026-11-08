import { useWatch } from 'react-hook-form';

import { Alert, SelectField } from '@/components';
import type { RoomFieldProps } from '../types';
import { LandlordRoomsLink } from './landlord-rooms-link';
import { RoomFacts } from './room-facts';

/**
 * Add subtenant's Room group: the list of rooms, then the picked room's rent and units, read-only, or its note (the
 * master room's, in First run, on the split). With no room to pick the list is disabled and a link opens Landlord &
 * rooms, where one can be added.
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
          <LandlordRoomsLink label="Open Rent & rooms" />
        </>
      ) : null}
      {picked && picked.facts.length > 0 ? <RoomFacts facts={picked.facts} /> : null}
      {picked?.note ? <Alert variant="info" message={picked.note} /> : null}
    </>
  );
}
