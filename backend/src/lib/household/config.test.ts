import { describe, expect, it } from "vitest";
import {
  JAN_2027_CONFIG,
  NOV_2026_CONFIG,
  PERSON_IDS,
  ROOM_IDS,
  VERSION_A_CONFIG,
} from "@/lib/fixtures/household";
import {
  HOUSEHOLD_SCHEMA_VERSION,
  householdConfigSchema,
  parseHouseholdConfig,
  type HouseholdConfig,
} from "@splithouse/shared";

const clone = () => structuredClone(NOV_2026_CONFIG);

function tenantRoom(config: HouseholdConfig, id: string) {
  const room = config.rooms.find((r) => r.id === id);
  if (room?.roomType !== "TENANT") throw new Error(`${id} is not a tenant room`);
  return room;
}

function messages(input: unknown) {
  const result = householdConfigSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe("household config", () => {
  it("accepts every fixture version", () => {
    for (const config of [VERSION_A_CONFIG, NOV_2026_CONFIG, JAN_2027_CONFIG]) {
      expect(messages(config)).toEqual([]);
    }
    expect(parseHouseholdConfig(HOUSEHOLD_SCHEMA_VERSION, NOV_2026_CONFIG)).toEqual(NOV_2026_CONFIG);
  });

  it("fills defaults for optional fields", () => {
    const input = {
      rooms: [{ id: "m", roomType: "MASTER", name: "Master room", airconUnits: 1 }],
      people: [{ personId: "a", role: "OWNER", roomId: "m" }],
      categories: {
        rent: { landlordRentCents: 0, landlordDueDay: 1, ownerBps: 10000, primaryBps: 0 },
        utilities: { totalShares: 1000, ownerBps: 10000, primaryBps: 0 },
        aircon: { ownerBps: 10000, primaryBps: 0 },
      },
      templates: { monthly: "m", nudge: "n" },
    };
    const parsed = householdConfigSchema.parse(input);
    expect(parsed.recurring).toEqual([]);
    expect(parsed.people[0].routes).toEqual({});
    expect(parsed.templates.overrides).toEqual([]);
    expect(parsed.templates.sectionTitles).toEqual({});
  });

  it("rejects an unknown schemaVersion", () => {
    expect(() => parseHouseholdConfig(99, NOV_2026_CONFIG)).toThrow(/schemaVersion/);
    expect(() => parseHouseholdConfig(1, NOV_2026_CONFIG)).toThrow(/schemaVersion/);
  });

  it("rejects split percentages that do not add to 100%", () => {
    const c = clone();
    c.categories.utilities.primaryBps = 4000;
    expect(messages(c)).toContain("Owner and primary percentages must add to 100%");
  });

  it("requires exactly one owner", () => {
    const c = clone();
    c.people[0].role = "TENANT";
    expect(messages(c)).toContain("Exactly one owner is required");
  });

  it("rejects tenant shares above the total", () => {
    const c = clone();
    c.categories.utilities.totalShares = 1500;
    expect(messages(c)).toContain("Tenant shares exceed the total");
  });

  it("rejects a route via an unknown or same person", () => {
    const c = clone();
    c.people[2].routes.UTILITIES = { kind: "VIA", viaPersonId: "nobody" };
    c.people[3].routes.UTILITIES = { kind: "VIA", viaPersonId: PERSON_IDS.jordan };
    expect(messages(c)).toEqual(
      expect.arrayContaining(["Unknown person to pay via", "A person cannot pay via themselves"]),
    );
  });

  it("rejects duplicate people and a recurring charge for an unknown person", () => {
    const c = clone();
    c.people.push({ ...c.people[3] });
    c.recurring[0].personId = "nobody";
    expect(messages(c)).toEqual(expect.arrayContaining(["Duplicate person", "Unknown person"]));
  });

  it("treats the bill due day as optional and rejects a day outside 1 to 31", () => {
    const c = clone();
    expect(householdConfigSchema.parse(c).categories.utilities.billDueDay).toBe(16);

    delete c.categories.utilities.billDueDay;
    expect(householdConfigSchema.safeParse(c).success).toBe(true);

    for (const day of [0, 32]) {
      c.categories.utilities.billDueDay = day;
      expect(householdConfigSchema.safeParse(c).success).toBe(false);
    }
  });

  it("rejects a bad end month", () => {
    const c = clone();
    c.recurring[0].endMonth = "2026-13";
    expect(messages(c)).toContain("Use YYYY-MM");
  });

  it("accepts section titles for known people and rejects an unknown person or a blank title", () => {
    const c = clone();
    c.templates.sectionTitles = { [PERSON_IDS.priya]: "Master Bedroom Share" };
    expect(messages(c)).toEqual([]);

    c.templates.sectionTitles = { "person-nobody": "Room 9", [PERSON_IDS.sam]: " " };
    expect(messages(c)).toEqual(expect.arrayContaining(["Unknown person"]));
    expect(messages(c)).toHaveLength(2);
  });

  describe("rooms", () => {
    it("rejects a duplicate room id", () => {
      const c = clone();
      c.rooms[4].id = ROOM_IDS.living;
      expect(messages(c)).toEqual(["Duplicate room"]);
    });

    it("rejects a duplicate room name, ignoring case", () => {
      const c = clone();
      c.rooms[4].name = "LIVING ROOM";
      expect(messages(c)).toEqual(["Duplicate room name"]);
    });

    it("requires exactly one master room", () => {
      const none = clone();
      none.rooms = none.rooms.filter((r) => r.roomType !== "MASTER");
      expect(messages(none)).toContain("Exactly one master room is required");

      const two = clone();
      two.rooms.push({ id: "room-second", roomType: "MASTER", name: "Second master", airconUnits: 0 });
      expect(messages(two)).toEqual(["Exactly one master room is required"]);
    });

    it("rejects a person in an unknown room", () => {
      const c = clone();
      c.people[2].roomId = "room-nowhere";
      expect(messages(c)).toEqual(["Unknown room"]);
    });

    it("keeps the owner and primary tenant in the master room", () => {
      const c = clone();
      c.people[1].roomId = ROOM_IDS.living;
      expect(messages(c)).toEqual(["Owner and primary tenant belong in the master room"]);
    });

    it("keeps a tenant in a tenant room", () => {
      for (const roomId of [ROOM_IDS.master, ROOM_IDS.living]) {
        const c = clone();
        c.people[2].roomId = roomId;
        expect(messages(c)).toEqual(["A tenant belongs in a tenant room"]);
      }
    });

    it("allows one tenant per room", () => {
      const c = clone();
      c.people[3].roomId = ROOM_IDS.room2;
      expect(messages(c)).toEqual(["A tenant room holds one tenant"]);
    });

    it("rejects a master rent below zero and allows exactly zero", () => {
      const c = clone();
      c.categories.rent.landlordRentCents = 94999;
      expect(messages(c)).toEqual(["Master room rent cannot be below zero"]);

      c.categories.rent.landlordRentCents = 95000;
      expect(messages(c)).toEqual([]);
    });

    it("leaves empty rooms and rooms outside the total out of the master rent check", () => {
      const c = clone();
      c.people = c.people.filter((p) => p.personId !== PERSON_IDS.sam);
      c.categories.rent.landlordRentCents = 0;
      expect(messages(c)).toEqual([]);
    });

    it("counts a room in the check once it is in the total", () => {
      const c = clone();
      tenantRoom(c, ROOM_IDS.room3).includeInTotal = true;
      c.categories.rent.landlordRentCents = 189999;
      expect(messages(c)).toEqual(["Master room rent cannot be below zero"]);
    });

    it("rejects a negative room rent", () => {
      const c = clone();
      tenantRoom(c, ROOM_IDS.room2).rentCents = -1;
      expect(householdConfigSchema.safeParse(c).success).toBe(false);
    });

    it("requires at least one aircon unit", () => {
      const c = clone();
      c.rooms.forEach((r) => {
        r.airconUnits = 0;
      });
      expect(messages(c)).toEqual(["The household needs at least one aircon unit"]);

      c.rooms[3].airconUnits = 1;
      expect(messages(c)).toEqual([]);
    });

    it("requires the landlord due day, from 1 to 31", () => {
      const c = clone();
      for (const day of [0, 32]) {
        c.categories.rent.landlordDueDay = day;
        expect(householdConfigSchema.safeParse(c).success).toBe(false);
      }
      const withoutDay: Record<string, unknown> = { ...c.categories.rent };
      delete withoutDay.landlordDueDay;
      expect(
        householdConfigSchema.safeParse({ ...c, categories: { ...c.categories, rent: withoutDay } }).success,
      ).toBe(false);
    });

    it("rejects utility shares on the owner or primary tenant", () => {
      const c = clone();
      c.people[1].utilityShares = 1000;
      expect(messages(c)).toContain("Owner and primary tenant take the remainder, not fixed shares");
    });
  });
});
