import { type HouseholdConfig, type HouseholdHomeEdit } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS, ROOM_IDS } from "@/lib/fixtures/household";
import { applyRemovePerson } from "./apply-edit";
import { planHomeEdit } from "./plan-home-edit";

const NAMES = new Map([[PERSON_IDS.priya, "Priya"]]);
const WITHOUT_JORDAN = applyRemovePerson(NOV_2026_CONFIG, PERSON_IDS.jordan);

const plan = (fields: Partial<HouseholdHomeEdit> = {}, config: HouseholdConfig = NOV_2026_CONFIG, newRoomIds = ["room-new"]) =>
  planHomeEdit({
    edit: { kind: "home", rooms: [], newRooms: [], removedRoomIds: [], ...fields },
    names: NAMES,
    month: "2026-12",
    base: { startsFromMonth: "2026-11", config },
    newRoomIds,
  });

const rowsOf = (result: ReturnType<typeof plan>) => result.groups.flatMap((g) => g.rows);

describe("planHomeEdit", () => {
  it("has nothing to save when nothing changes, and still gives the master rent", () => {
    const result = plan({
      landlordRentCents: 430000,
      landlordDueDay: 1,
      billDueDay: 16,
      rooms: [{ id: ROOM_IDS.room2, name: "Room 2", airconUnits: 1, rentCents: 95000, includeInTotal: true }],
    });
    expect(result).toEqual({ nextConfig: null, groups: [], errors: {}, warnings: {}, masterRent: "$3,350.00", canSave: false });
  });

  it("matches the changed board: no master row beside Landlord rent", () => {
    const result = plan({ landlordRentCents: 440000 });
    expect(result.groups).toEqual([
      {
        title: "Saves from Dec 2026",
        rows: [
          { label: "Rent amount", from: "$4,300.00", to: "$4,400.00" },
          { label: "Your rent share", from: "$1,675.00", to: "$1,725.00" },
          { label: "Priya’s rent", from: "$1,675.00", to: "$1,725.00" },
        ],
      },
    ]);
    expect(result.masterRent).toBe("$3,450.00");
    expect(result.canSave).toBe(true);
    expect(result.nextConfig?.categories.rent.landlordRentCents).toBe(440000);
  });

  it("matches the error board: both messages, no summary and no Save", () => {
    const result = plan({ landlordRentCents: 90000 });
    expect(result.errors).toEqual({
      landlordRentCents: "Less than Room 2’s rent of $950.00",
      [`rooms.${ROOM_IDS.master}.rentCents`]: "Nothing left for the Master room",
    });
    expect(result).toMatchObject({ groups: [], masterRent: null, canSave: false, nextConfig: null });
  });

  it("names the sum when several rooms in the total pass the landlord rent", () => {
    const result = plan({
      landlordRentCents: 150000,
      rooms: [{ id: ROOM_IDS.room3, includeInTotal: true }],
    });
    expect(result.errors.landlordRentCents).toBe("Less than the rooms in the total, $1,900.00");
  });

  it("uses the master room's name in its message", () => {
    const result = plan({
      landlordRentCents: 90000,
      rooms: [{ id: ROOM_IDS.master, name: "Big room" }],
    });
    expect(result.errors[`rooms.${ROOM_IDS.master}.rentCents`]).toBe("Nothing left for the Big room");
  });

  it("matches the warning board: a room at no rent warns, allows Save and shows the master row", () => {
    const result = plan({ rooms: [{ id: ROOM_IDS.room2, rentCents: 0 }] });
    expect(result.warnings).toEqual({ [`rooms.${ROOM_IDS.room2}.rentCents`]: "Room 2 rent is 0" });
    expect(result.errors).toEqual({});
    expect(result.canSave).toBe(true);
    expect(rowsOf(result)).toEqual([
      { label: "Room 2 rent", from: "$950.00", to: "$0.00" },
      { label: "Master room rent", from: "$3,350.00", to: "$4,300.00" },
      { label: "Your rent share", from: "$1,675.00", to: "$2,150.00" },
      { label: "Priya’s rent", from: "$1,675.00", to: "$2,150.00" },
    ]);
  });

  it("matches the removed board: an empty tenant room goes and the units follow", () => {
    const result = plan({ removedRoomIds: [ROOM_IDS.room3] }, WITHOUT_JORDAN);
    expect(rowsOf(result)).toEqual([
      { label: "Room 3", from: "Empty", to: "Removed" },
      { label: "Aircon units", from: "6", to: "5" },
    ]);
    expect(result.canSave).toBe(true);
    expect(result.nextConfig?.rooms.map((r) => r.id)).not.toContain(ROOM_IDS.room3);
  });

  it("removes a common room", () => {
    const result = plan({ removedRoomIds: [ROOM_IDS.utility] });
    expect(rowsOf(result)).toEqual([
      { label: "Utility room", from: "Common", to: "Removed" },
      { label: "Aircon units", from: "6", to: "5" },
    ]);
  });

  it("ignores edits to a room that is also being removed", () => {
    const result = plan({ rooms: [{ id: ROOM_IDS.utility, airconUnits: null }], removedRoomIds: [ROOM_IDS.utility] });
    expect(result.errors).toEqual({});
    expect(result.canSave).toBe(true);
  });

  it.each([
    [ROOM_IDS.room2, "Room 2 has a tenant, so it can’t be removed."],
    [ROOM_IDS.master, "The master room can’t be removed."],
    ["room-gone", "This room is no longer in the household."],
  ])("refuses to remove %s", (id, message) => {
    expect(plan({ removedRoomIds: [id] })).toMatchObject({ errors: { form: message }, canSave: false, nextConfig: null });
  });

  it("lists the undrawn changes as agreed, with labels from the saved name", () => {
    const result = plan({
      landlordDueDay: 5,
      billDueDay: 18,
      rooms: [{ id: ROOM_IDS.room3, name: "Study", airconUnits: 2, includeInTotal: true }],
    });
    expect(rowsOf(result)).toEqual([
      { label: "Rent due date", from: "1st", to: "5th" },
      { label: "Utilities due date", from: "16th", to: "18th" },
      { label: "Room 3 name", from: "Room 3", to: "Study" },
      { label: "Room 3 aircon units", from: "1", to: "2" },
      { label: "Room 3 in total", from: "No", to: "Yes" },
      { label: "Master room rent", from: "$3,350.00", to: "$2,400.00" },
      { label: "Your rent share", from: "$1,675.00", to: "$1,200.00" },
      { label: "Priya’s rent", from: "$1,675.00", to: "$1,200.00" },
      { label: "Aircon units", from: "6", to: "7" },
    ]);
  });

  it("clears the optional bill due day, leaving no key behind", () => {
    const result = plan({ billDueDay: null });
    expect(rowsOf(result)).toEqual([{ label: "Utilities due date", from: "16th", to: "—" }]);
    expect(result.nextConfig?.categories.utilities).not.toHaveProperty("billDueDay");
  });

  it("adds a tenant room and a common room, with no effect on the rent", () => {
    const result = plan(
      {
        newRooms: [
          { roomType: "TENANT", name: "Room 4", airconUnits: 1, rentCents: 80000, includeInTotal: true },
          { roomType: "COMMON", name: "Study", airconUnits: 0 },
        ],
      },
      NOV_2026_CONFIG,
      ["room-a", "room-b"],
    );
    expect(rowsOf(result)).toEqual([
      { label: "Room 4", from: null, to: "Added" },
      { label: "Study", from: null, to: "Added" },
      { label: "Aircon units", from: "6", to: "7" },
    ]);
    expect(result.nextConfig?.rooms.at(-2)).toEqual({
      id: "room-a",
      roomType: "TENANT",
      name: "Room 4",
      airconUnits: 1,
      rentCents: 80000,
      includeInTotal: true,
    });
    expect(result.nextConfig?.rooms.at(-1)).toEqual({ id: "room-b", roomType: "COMMON", name: "Study", airconUnits: 0 });
    expect(result.masterRent).toBe("$3,350.00");
  });

  it("answers an empty field with an error", () => {
    const result = plan({
      landlordRentCents: null,
      landlordDueDay: null,
      rooms: [{ id: ROOM_IDS.room2, name: " ", airconUnits: null, rentCents: null }],
      newRooms: [{ roomType: "TENANT", name: "", airconUnits: null, rentCents: null, includeInTotal: true }],
    });
    expect(result.errors).toEqual({
      landlordRentCents: "Enter the rent amount.",
      landlordDueDay: "Enter a day from 1 to 31.",
      [`rooms.${ROOM_IDS.room2}.name`]: "Enter a room name.",
      [`rooms.${ROOM_IDS.room2}.airconUnits`]: "Enter the aircon units.",
      [`rooms.${ROOM_IDS.room2}.rentCents`]: "Enter the rent.",
      "newRooms.0.name": "Enter a room name.",
      "newRooms.0.airconUnits": "Enter the aircon units.",
      "newRooms.0.rentCents": "Enter the rent.",
    });
    expect(result).toMatchObject({ masterRent: null, canSave: false, groups: [] });
  });

  it("keeps working out the master rent while only a name is wrong", () => {
    const result = plan({ landlordRentCents: 440000, rooms: [{ id: ROOM_IDS.room2, name: "" }] });
    expect(result).toMatchObject({ masterRent: "$3,450.00", canSave: false, groups: [] });
  });

  it("refuses amounts below zero and days outside 1 to 31", () => {
    const result = plan({
      landlordRentCents: -1,
      landlordDueDay: 0,
      billDueDay: 32,
      rooms: [{ id: ROOM_IDS.room2, airconUnits: -1, rentCents: -1 }],
    });
    expect(result.errors).toEqual({
      landlordRentCents: "Enter 0 or more.",
      landlordDueDay: "Enter a day from 1 to 31.",
      billDueDay: "Enter a day from 1 to 31.",
      [`rooms.${ROOM_IDS.room2}.airconUnits`]: "Enter 0 or more.",
      [`rooms.${ROOM_IDS.room2}.rentCents`]: "Enter 0 or more.",
    });
  });

  it("refuses a name another room has, ignoring case, on the saved or new room", () => {
    expect(plan({ rooms: [{ id: ROOM_IDS.room3, name: "room 2" }] }).errors).toEqual({
      [`rooms.${ROOM_IDS.room3}.name`]: "Duplicate room name",
    });
    expect(plan({ newRooms: [{ roomType: "COMMON", name: "Living Room", airconUnits: 1 }] }).errors).toEqual({
      "newRooms.0.name": "Duplicate room name",
    });
  });

  it("refuses rent on a room that isn't a tenant room", () => {
    expect(plan({ rooms: [{ id: ROOM_IDS.living, rentCents: 100 }] }).errors.form).toBe("Only tenant rooms have rent.");
    expect(plan({ rooms: [{ id: ROOM_IDS.master, includeInTotal: true }] }).errors.form).toBe("Only tenant rooms have rent.");
  });

  it("refuses an edit to a room that has gone", () => {
    expect(plan({ rooms: [{ id: "room-gone", name: "X" }] }).errors.form).toBe("This room is no longer in the household.");
  });

  it("refuses a household with no aircon units left, through the config schema", () => {
    const result = plan({
      rooms: NOV_2026_CONFIG.rooms.map((room) => ({ id: room.id, airconUnits: 0 })),
    });
    expect(result).toMatchObject({ errors: { form: "The household needs at least one aircon unit" }, canSave: false });
  });

  it("leaves the people and recurring charges alone", () => {
    const next = plan({ landlordRentCents: 440000 }).nextConfig;
    expect(next?.people).toEqual(NOV_2026_CONFIG.people);
    expect(next?.recurring).toEqual(NOV_2026_CONFIG.recurring);
  });
});
