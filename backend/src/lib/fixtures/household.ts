import type { HouseholdConfig } from "@splithouse/shared";

// Nov 2026 fixtures from the Data Model doc, with fictional names.
// Alex = owner, Priya = primary tenant, Sam = Tenant 1, Jordan = Tenant 2.
export const PERSON_IDS = {
  alex: "person-alex",
  priya: "person-priya",
  sam: "person-sam",
  jordan: "person-jordan",
} as const;

export const ROOM_IDS = {
  master: "room-master",
  room2: "room-2",
  room3: "room-3",
  living: "room-living",
  utility: "room-utility",
} as const;

// The sample home: Sam in Room 2, Jordan in Room 3 (not part of the landlord rent), 6 aircon units.
function sampleRooms(tenantRentCents: number): HouseholdConfig["rooms"] {
  return [
    { id: ROOM_IDS.master, roomType: "MASTER", name: "Master room", airconUnits: 1 },
    { id: ROOM_IDS.room2, roomType: "TENANT", name: "Room 2", airconUnits: 1, rentCents: tenantRentCents, includeInTotal: true },
    { id: ROOM_IDS.room3, roomType: "TENANT", name: "Room 3", airconUnits: 1, rentCents: tenantRentCents, includeInTotal: false },
    { id: ROOM_IDS.living, roomType: "COMMON", name: "Living room", airconUnits: 2 },
    { id: ROOM_IDS.utility, roomType: "COMMON", name: "Utility room", airconUnits: 1 },
  ];
}

// Version A: the seed's "past" household, in force Aug-Oct 2026. Numbers are
// deliberately a little different from Nov so history doesn't look identical
// every month, and so seeding exercises the versioning rule (a month uses the
// newest version starting on or before it).
export const VERSION_A_CONFIG: HouseholdConfig = {
  rooms: sampleRooms(92000),
  people: [
    { personId: PERSON_IDS.alex, role: "OWNER", roomId: ROOM_IDS.master, utilityShares: 0, routes: {}, dueDays: {}, depositCents: 0 },
    {
      personId: PERSON_IDS.priya,
      role: "PRIMARY",
      roomId: ROOM_IDS.master,
      utilityShares: 0,
      routes: {},
      dueDays: { RENT: 7, UTILITIES: 7, AIRCON: 7 },
      depositCents: 0,
    },
    {
      personId: PERSON_IDS.sam,
      role: "TENANT",
      roomId: ROOM_IDS.room2,
      utilityShares: 1000,
      routes: {
        UTILITIES: { kind: "VIA", viaPersonId: PERSON_IDS.priya },
        AIRCON: { kind: "VIA", viaPersonId: PERSON_IDS.priya },
      },
      dueDays: { RENT: 28 },
      depositCents: 0,
    },
    {
      personId: PERSON_IDS.jordan,
      role: "TENANT",
      roomId: ROOM_IDS.room3,
      utilityShares: 1000,
      routes: {},
      dueDays: { RENT: 1, UTILITIES: 4, AIRCON: 4 },
      depositCents: 92000,
    },
  ],
  categories: {
    rent: { landlordRentCents: 422000, landlordDueDay: 1, ownerBps: 5000, primaryBps: 5000 },
    utilities: { totalShares: 4800, ownerBps: 5000, primaryBps: 5000, billDueDay: 25 },
    aircon: { ownerBps: 5000, primaryBps: 5000 },
  },
  recurring: [
    { id: "recurring-starhub", label: "Starhub", amountCents: 2750, personId: PERSON_IDS.priya },
  ],
};

export const NOV_2026_CONFIG: HouseholdConfig = {
  rooms: sampleRooms(95000),
  people: [
    { personId: PERSON_IDS.alex, role: "OWNER", roomId: ROOM_IDS.master, utilityShares: 0, routes: {}, dueDays: {}, depositCents: 0 },
    {
      personId: PERSON_IDS.priya,
      role: "PRIMARY",
      roomId: ROOM_IDS.master,
      utilityShares: 0,
      routes: {},
      dueDays: { RENT: 7, UTILITIES: 7, AIRCON: 7 },
      depositCents: 0,
    },
    {
      personId: PERSON_IDS.sam,
      role: "TENANT",
      roomId: ROOM_IDS.room2,
      utilityShares: 1000,
      routes: {
        UTILITIES: { kind: "VIA", viaPersonId: PERSON_IDS.priya },
        AIRCON: { kind: "VIA", viaPersonId: PERSON_IDS.priya },
      },
      dueDays: { RENT: 28 },
      depositCents: 0,
    },
    {
      personId: PERSON_IDS.jordan,
      role: "TENANT",
      roomId: ROOM_IDS.room3,
      utilityShares: 1000,
      routes: {},
      dueDays: { RENT: 1, UTILITIES: 4, AIRCON: 4 },
      depositCents: 95000,
    },
  ],
  categories: {
    rent: { landlordRentCents: 430000, landlordDueDay: 1, ownerBps: 5000, primaryBps: 5000 },
    utilities: { totalShares: 5000, ownerBps: 5000, primaryBps: 5000, billDueDay: 16 },
    aircon: { ownerBps: 5000, primaryBps: 5000 },
  },
  recurring: [
    { id: "recurring-starhub", label: "Starhub", amountCents: 2750, personId: PERSON_IDS.priya },
  ],
};

// An upcoming version no month has opened: as Nov 2026, with Jordan's rent up to $X,XXX.XX.
export const JAN_2027_CONFIG: HouseholdConfig = {
  ...NOV_2026_CONFIG,
  rooms: NOV_2026_CONFIG.rooms.map((room) =>
    room.id === ROOM_IDS.room3 ? { ...room, rentCents: 100000 } : room,
  ),
};
