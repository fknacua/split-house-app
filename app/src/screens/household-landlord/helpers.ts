import type { HouseholdHomeEdit, HouseholdHomeFormResponse, HouseholdNewRoom } from '@splithouse/shared';

/** A saved room's fields. Rent and Include in total only count for a tenant room. */
export interface RoomFormValues {
  id: string;
  roomType: HouseholdHomeFormResponse['rooms'][number]['roomType'];
  name: string;
  airconUnits: number | null;
  rentCents: number | null;
  includeInTotal: boolean;
  /** Marked with Remove room. It only goes when Save is pressed, and Undo brings it back. */
  removed: boolean;
}

/** A room from Add room, not saved yet. Rent and Include in total only count for a tenant room. */
export interface NewRoomFormValues {
  roomType: HouseholdNewRoom['roomType'];
  name: string;
  airconUnits: number | null;
  rentCents: number | null;
  includeInTotal: boolean;
}

/** The Landlord & rooms form's values. Empty number fields are `null`. */
export interface HomeFormValues {
  landlordRentCents: number | null;
  landlordDueDay: number | null;
  billDueDay: number | null;
  rooms: RoomFormValues[];
  newRooms: NewRoomFormValues[];
}

/** Add room's starting values. New tenant rooms start with Include in total on, as drawn. */
export const EMPTY_NEW_ROOM: NewRoomFormValues = {
  roomType: 'TENANT',
  name: '',
  airconUnits: null,
  rentCents: null,
  includeInTotal: true,
};

/**
 * Fills the form from the server's response. The rooms to add (First run's master room before the first save) start
 * in `newRooms`, so they go with the save.
 *
 * @param form The form response.
 * @returns The form's values, with no room removed and only the server's rooms to add.
 */
export function toHomeFormValues(form: HouseholdHomeFormResponse): HomeFormValues {
  return {
    ...form.values,
    rooms: form.rooms.map((room) => ({
      id: room.id,
      roomType: room.roomType,
      name: room.name,
      airconUnits: room.airconUnits,
      rentCents: room.rentCents,
      includeInTotal: room.includeInTotal ?? false,
      removed: false,
    })),
    newRooms: form.roomsToAdd.map((room) => ({
      roomType: room.roomType,
      name: room.name,
      airconUnits: room.airconUnits,
      rentCents: room.rentCents,
      includeInTotal: room.includeInTotal ?? false,
    })),
  };
}

/**
 * Builds the edit from the whole form, so the server can warn about a room at no rent even when it did not change.
 * The server decides what changed and checks every field. Rent and Include in total go only with a tenant room.
 *
 * @param values The form's values.
 * @returns The edit for the preview and the save.
 */
export function toHomeEdit(values: HomeFormValues): HouseholdHomeEdit {
  const kept = values.rooms.filter((room) => !room.removed);
  return {
    kind: 'home',
    landlordRentCents: values.landlordRentCents,
    landlordDueDay: values.landlordDueDay,
    billDueDay: values.billDueDay,
    rooms: kept.map(({ id, roomType, name, airconUnits, rentCents, includeInTotal }) => ({
      id,
      name,
      airconUnits,
      ...(roomType === 'TENANT' ? { rentCents, includeInTotal } : {}),
    })),
    newRooms: values.newRooms.map(({ roomType, name, airconUnits, rentCents, includeInTotal }) =>
      roomType === 'TENANT'
        ? { roomType, name, airconUnits, rentCents, includeInTotal }
        : { roomType, name, airconUnits },
    ),
    removedRoomIds: values.rooms.filter((room) => room.removed).map((room) => room.id),
  };
}

/**
 * Whether leaving the form would lose anything.
 *
 * @param values The form's values.
 * @param form The loaded form response.
 * @returns True when a field differs from how the form opened, or a room was added or removed.
 */
export function hasHomeChanges(values: HomeFormValues, form: HouseholdHomeFormResponse): boolean {
  return JSON.stringify(values) !== JSON.stringify(toHomeFormValues(form));
}

/**
 * Whether Add room can add what is typed. Every field it shows is required, and the card's preview checks the rest.
 *
 * @param room The sheet's values.
 * @returns True when the name and units, and a tenant room's rent, are filled.
 */
export function isNewRoomFilled(room: NewRoomFormValues): boolean {
  if (room.name.trim() === '' || room.airconUnits === null) return false;
  return room.roomType !== 'TENANT' || room.rentCents !== null;
}
