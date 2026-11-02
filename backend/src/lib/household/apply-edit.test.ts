import type { HouseholdPersonEdit } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { applyHouseholdEdit } from "./apply-edit";

const edit = (personId: string, fields: Partial<HouseholdPersonEdit>): HouseholdPersonEdit => ({
  kind: "person",
  personId,
  startsFromMonth: "2027-01",
  ...fields,
});
const person = (config: typeof NOV_2026_CONFIG, personId: string) => config.people.find((p) => p.personId === personId);

describe("applyHouseholdEdit", () => {
  it.each([
    ["rent", { rentCents: 100000 }, { rentCents: 100000 }],
    ["shares", { utilityShares: 1500 }, { utilityShares: 1500 }],
    ["units", { airconUnits: 2 }, { airconUnits: 2 }],
    ["deposit", { depositCents: 0 }, { depositCents: 0 }],
    ["rent due", { rentDueDay: 5 }, { dueDays: { RENT: 5, UTILITIES: 4, AIRCON: 4 } }],
    ["utilities due, which also sets aircon", { utilitiesDueDay: 9 }, { dueDays: { RENT: 1, UTILITIES: 9, AIRCON: 9 } }],
    ["utilities cleared, with aircon", { utilitiesDueDay: null }, { dueDays: { RENT: 1 } }],
    ["rent due cleared", { rentDueDay: null }, { dueDays: { UTILITIES: 4, AIRCON: 4 } }],
  ])("applies %s", (_name, fields, expected) => {
    const next = applyHouseholdEdit(NOV_2026_CONFIG, edit(PERSON_IDS.jordan, fields));
    expect(person(next, PERSON_IDS.jordan)).toMatchObject(expected);
  });

  it("leaves the aircon day alone when the utilities day does not change", () => {
    const config = {
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people.map((p) =>
        p.personId === PERSON_IDS.jordan ? { ...p, dueDays: { UTILITIES: 4, AIRCON: 6 } } : p,
      ),
    };
    const next = applyHouseholdEdit(config, edit(PERSON_IDS.jordan, { utilitiesDueDay: 4 }));
    expect(person(next, PERSON_IDS.jordan)?.dueDays).toEqual({ UTILITIES: 4, AIRCON: 6 });
  });

  it("changes nobody else, and not the config it was given", () => {
    const before = structuredClone(NOV_2026_CONFIG);
    const next = applyHouseholdEdit(NOV_2026_CONFIG, edit(PERSON_IDS.jordan, { rentCents: 100000 }));
    expect(person(next, PERSON_IDS.sam)).toEqual(person(before, PERSON_IDS.sam));
    expect(NOV_2026_CONFIG).toEqual(before);
  });

  it("leaves routes as they are", () => {
    const next = applyHouseholdEdit(NOV_2026_CONFIG, edit(PERSON_IDS.sam, { rentCents: 100000 }));
    expect(person(next, PERSON_IDS.sam)?.routes).toEqual(person(NOV_2026_CONFIG, PERSON_IDS.sam)?.routes);
  });
});
