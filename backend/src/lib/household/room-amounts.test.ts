import { describe, expect, it } from "vitest";
import {
  JAN_2027_CONFIG,
  NOV_2026_CONFIG,
  PERSON_IDS,
  ROOM_IDS,
  VERSION_A_CONFIG,
} from "@/lib/fixtures/household";
import {
  isRentInTotal,
  masterRentCents,
  peopleIn,
  roomCount,
  roomOf,
  sharedAirconUnits,
  tenantRentCents,
  totalAirconUnits,
} from "./room-amounts";

function without(personId: string) {
  return {
    ...NOV_2026_CONFIG,
    people: NOV_2026_CONFIG.people.filter((p) => p.personId !== personId),
  };
}

describe("isRentInTotal", () => {
  it("is false only for a tenant room with Include in total off", () => {
    expect(isRentInTotal(NOV_2026_CONFIG, PERSON_IDS.jordan)).toBe(false);
    expect(isRentInTotal(NOV_2026_CONFIG, PERSON_IDS.sam)).toBe(true);
    expect(isRentInTotal(NOV_2026_CONFIG, PERSON_IDS.priya)).toBe(true);
    expect(isRentInTotal(NOV_2026_CONFIG, PERSON_IDS.alex)).toBe(true);
  });
});

describe("masterRentCents", () => {
  it("subtracts only the occupied rooms in the total, matching the fixtures", () => {
    expect(masterRentCents(NOV_2026_CONFIG)).toBe(335000);
    expect(masterRentCents(VERSION_A_CONFIG)).toBe(330000);
  });

  it("does not move when a room outside the total changes rent", () => {
    expect(masterRentCents(JAN_2027_CONFIG)).toBe(335000);
  });

  it("does not subtract an empty room, so the owner and primary tenant cover it", () => {
    expect(masterRentCents(without(PERSON_IDS.sam))).toBe(430000);
  });

  it("is unchanged when the tenant of a room outside the total leaves", () => {
    expect(masterRentCents(without(PERSON_IDS.jordan))).toBe(335000);
  });

  it("subtracts a room once it is switched into the total", () => {
    const config = {
      ...NOV_2026_CONFIG,
      rooms: NOV_2026_CONFIG.rooms.map((room) =>
        room.id === ROOM_IDS.room3 ? { ...room, includeInTotal: true } : room,
      ),
    };
    expect(masterRentCents(config)).toBe(240000);
  });
});

describe("aircon units", () => {
  it("totals every room and leaves the owner and primary tenant 4 of 6", () => {
    expect(totalAirconUnits(NOV_2026_CONFIG)).toBe(6);
    expect(sharedAirconUnits(NOV_2026_CONFIG)).toBe(4);
  });

  it("moves an empty room's units to the owner and primary tenant, keeping the total", () => {
    const config = without(PERSON_IDS.jordan);
    expect(totalAirconUnits(config)).toBe(6);
    expect(sharedAirconUnits(config)).toBe(5);
  });
});

describe("roomCount", () => {
  it("counts master and tenant rooms, not common ones", () => {
    expect(roomCount(NOV_2026_CONFIG)).toBe(3);
  });

  it("still counts an empty tenant room", () => {
    expect(roomCount(without(PERSON_IDS.sam))).toBe(3);
  });
});

describe("roomOf", () => {
  it("finds a person's room", () => {
    expect(roomOf(NOV_2026_CONFIG, PERSON_IDS.priya).id).toBe(ROOM_IDS.master);
    expect(roomOf(NOV_2026_CONFIG, PERSON_IDS.sam).id).toBe(ROOM_IDS.room2);
  });

  it("throws for someone not in the config", () => {
    expect(() => roomOf(NOV_2026_CONFIG, "person-nobody")).toThrow(/person-nobody/);
  });
});

describe("tenantRentCents", () => {
  it("reads a tenant's room, and 0 for the owner and primary tenant", () => {
    expect(tenantRentCents(JAN_2027_CONFIG, PERSON_IDS.sam)).toBe(95000);
    expect(tenantRentCents(JAN_2027_CONFIG, PERSON_IDS.jordan)).toBe(100000);
    expect(tenantRentCents(JAN_2027_CONFIG, PERSON_IDS.priya)).toBe(0);
  });
});

describe("peopleIn", () => {
  it("lists a room's people and nobody for a common or empty room", () => {
    expect(peopleIn(NOV_2026_CONFIG, ROOM_IDS.master).map((p) => p.personId)).toEqual([
      PERSON_IDS.alex,
      PERSON_IDS.priya,
    ]);
    expect(peopleIn(NOV_2026_CONFIG, ROOM_IDS.room3).map((p) => p.personId)).toEqual([PERSON_IDS.jordan]);
    expect(peopleIn(NOV_2026_CONFIG, ROOM_IDS.living)).toEqual([]);
    expect(peopleIn(without(PERSON_IDS.sam), ROOM_IDS.room2)).toEqual([]);
  });
});
