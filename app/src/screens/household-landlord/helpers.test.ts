import { describe, expect, it } from 'vitest';

import type { HouseholdHomeFormResponse } from '@splithouse/shared';
import { EMPTY_NEW_ROOM, hasHomeChanges, isNewRoomFilled, toHomeEdit, toHomeFormValues } from './helpers';

const FORM: HouseholdHomeFormResponse = {
  title: 'Rent & rooms',
  sub: 'Rent, due dates and rooms',
  datedTitle: 'From December 2026',
  pendingNote: null,
  values: { landlordRentCents: 430000, landlordDueDay: 1, billDueDay: 16 },
  rooms: [
    {
      id: 'room-master',
      roomType: 'MASTER',
      title: 'Master room',
      name: 'Master room',
      airconUnits: 1,
      rentCents: null,
      includeInTotal: null,
      calculatedRent: '$3,350.00',
      occupants: 'You + Priya',
      badge: null,
      canRemove: false,
    },
    {
      id: 'room-2',
      roomType: 'TENANT',
      title: 'Tenant room',
      name: 'Room 2',
      airconUnits: 1,
      rentCents: 95000,
      includeInTotal: true,
      calculatedRent: null,
      occupants: 'Sam',
      badge: null,
      canRemove: false,
    },
    {
      id: 'room-living',
      roomType: 'COMMON',
      title: 'Common room',
      name: 'Living room',
      airconUnits: 2,
      rentCents: null,
      includeInTotal: null,
      calculatedRent: null,
      occupants: null,
      badge: null,
      canRemove: true,
    },
  ],
  roomsToAdd: [],
  newRoomTypes: [
    { roomType: 'TENANT', title: 'Tenant room', badge: { label: 'Empty', tone: 'neutral' } },
    { roomType: 'COMMON', title: 'Common room', badge: null },
  ],
};

describe('toHomeEdit', () => {
  it('sends the whole form, with rent and Include in total only on a tenant room', () => {
    expect(toHomeEdit(toHomeFormValues(FORM))).toEqual({
      kind: 'home',
      landlordRentCents: 430000,
      landlordDueDay: 1,
      billDueDay: 16,
      rooms: [
        { id: 'room-master', name: 'Master room', airconUnits: 1 },
        { id: 'room-2', name: 'Room 2', airconUnits: 1, rentCents: 95000, includeInTotal: true },
        { id: 'room-living', name: 'Living room', airconUnits: 2 },
      ],
      newRooms: [],
      removedRoomIds: [],
    });
  });

  it('moves a removed room from the rooms to the removed list', () => {
    const values = toHomeFormValues(FORM);
    values.rooms[2].removed = true;
    const edit = toHomeEdit(values);
    expect(edit.rooms.map((r) => r.id)).toEqual(['room-master', 'room-2']);
    expect(edit.removedRoomIds).toEqual(['room-living']);
  });

  it('sends a new room in the shape of its type', () => {
    const values = toHomeFormValues(FORM);
    values.newRooms = [
      { ...EMPTY_NEW_ROOM, name: 'Room 4', airconUnits: 1, rentCents: 80000 },
      { ...EMPTY_NEW_ROOM, roomType: 'COMMON', name: 'Study', airconUnits: 1 },
    ];
    expect(toHomeEdit(values).newRooms).toEqual([
      { roomType: 'TENANT', name: 'Room 4', airconUnits: 1, rentCents: 80000, includeInTotal: true },
      { roomType: 'COMMON', name: 'Study', airconUnits: 1 },
    ]);
  });

  it('keeps an empty field as null, for the server to answer', () => {
    const values = toHomeFormValues(FORM);
    values.landlordRentCents = null;
    values.rooms[1].rentCents = null;
    const edit = toHomeEdit(values);
    expect(edit.landlordRentCents).toBeNull();
    expect(edit.rooms[1].rentCents).toBeNull();
  });

  it('fills a blank First run form with nulls', () => {
    const blank = { ...FORM, values: { landlordRentCents: null, landlordDueDay: null, billDueDay: null } };
    expect(toHomeFormValues(blank)).toMatchObject({ landlordRentCents: null, landlordDueDay: null, billDueDay: null });
  });

  it('seeds the rooms to add and sends the master room as a new room', () => {
    const first: HouseholdHomeFormResponse = {
      ...FORM,
      values: { landlordRentCents: null, landlordDueDay: null, billDueDay: null },
      rooms: [],
      roomsToAdd: [
        {
          roomType: 'MASTER',
          title: 'Master room',
          name: 'Master room',
          airconUnits: null,
          rentCents: null,
          includeInTotal: null,
          calculatedRent: '—',
          occupants: 'You',
          badge: null,
          canRemove: false,
        },
      ],
    };
    const values = toHomeFormValues(first);
    expect(values.newRooms).toEqual([
      { roomType: 'MASTER', name: 'Master room', airconUnits: null, rentCents: null, includeInTotal: false },
    ]);
    expect(hasHomeChanges(values, first)).toBe(false);
    values.newRooms[0].airconUnits = 2;
    expect(toHomeEdit(values).newRooms).toEqual([{ roomType: 'MASTER', name: 'Master room', airconUnits: 2 }]);
  });
});

describe('hasHomeChanges', () => {
  it('is false as the form opened', () => {
    expect(hasHomeChanges(toHomeFormValues(FORM), FORM)).toBe(false);
  });

  it('is true for a changed field, a removed room or an added room', () => {
    const changed = toHomeFormValues(FORM);
    changed.landlordDueDay = 5;
    expect(hasHomeChanges(changed, FORM)).toBe(true);

    const removed = toHomeFormValues(FORM);
    removed.rooms[2].removed = true;
    expect(hasHomeChanges(removed, FORM)).toBe(true);

    const added = toHomeFormValues(FORM);
    added.newRooms = [EMPTY_NEW_ROOM];
    expect(hasHomeChanges(added, FORM)).toBe(true);
  });
});

describe('isNewRoomFilled', () => {
  it('needs the name, units and a tenant room rent', () => {
    expect(isNewRoomFilled(EMPTY_NEW_ROOM)).toBe(false);
    expect(isNewRoomFilled({ ...EMPTY_NEW_ROOM, name: 'Room 4', airconUnits: 1 })).toBe(false);
    expect(isNewRoomFilled({ ...EMPTY_NEW_ROOM, name: ' ', airconUnits: 1, rentCents: 1 })).toBe(false);
    expect(isNewRoomFilled({ ...EMPTY_NEW_ROOM, name: 'Room 4', airconUnits: 0, rentCents: 0 })).toBe(true);
  });

  it('needs no rent for a common room', () => {
    expect(isNewRoomFilled({ ...EMPTY_NEW_ROOM, roomType: 'COMMON', name: 'Study', airconUnits: 1 })).toBe(true);
  });
});
