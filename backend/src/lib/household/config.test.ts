import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import {
  HOUSEHOLD_SCHEMA_VERSION,
  householdConfigSchema,
  parseHouseholdConfig,
} from "@splithouse/shared";

const clone = () => structuredClone(NOV_2026_CONFIG);

function messages(input: unknown) {
  const result = householdConfigSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe("household config", () => {
  it("accepts the Nov 2026 fixture", () => {
    expect(householdConfigSchema.safeParse(NOV_2026_CONFIG).success).toBe(true);
    expect(parseHouseholdConfig(HOUSEHOLD_SCHEMA_VERSION, NOV_2026_CONFIG)).toEqual(NOV_2026_CONFIG);
  });

  it("fills defaults for optional fields", () => {
    const input = {
      people: [{ personId: "a", role: "OWNER" }],
      categories: {
        rent: { sharedRentCents: 0, ownerBps: 10000, primaryBps: 0 },
        utilities: { totalShares: 1000, ownerBps: 10000, primaryBps: 0 },
        aircon: { totalUnits: 1, ownerBps: 10000, primaryBps: 0 },
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
});
