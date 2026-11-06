import type { HouseholdConfig } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { defaultPreviewPerson, templatePeople } from "./template-people";

const { alex, priya, sam, jordan } = PERSON_IDS;
const PEOPLE = [
  { id: alex, name: "Alex", color: "TEAL" as const },
  { id: priya, name: "priya", color: "PINK" as const },
  { id: sam, name: "Sam", color: "GREEN" as const },
  { id: jordan, name: "Jordan", color: "BLUE" as const },
];

const without = (config: HouseholdConfig, personId: string): HouseholdConfig => ({
  ...config,
  people: config.people.filter((p) => p.personId !== personId),
});

describe("templatePeople", () => {
  it("lists everyone but the owner, the primary tenant first, with role, room, initial and colour", () => {
    expect(templatePeople([NOV_2026_CONFIG], PEOPLE)).toEqual([
      { personId: priya, name: "priya", initial: "P", color: "PINK", role: "Primary Tenant", room: "Master room", config: NOV_2026_CONFIG },
      { personId: sam, name: "Sam", initial: "S", color: "GREEN", role: "Tenant", room: "Room 2", config: NOV_2026_CONFIG },
      { personId: jordan, name: "Jordan", initial: "J", color: "BLUE", role: "Tenant", room: "Room 3", config: NOV_2026_CONFIG },
    ]);
  });

  it("puts the primary tenant first wherever the config lists them", () => {
    const reordered = { ...NOV_2026_CONFIG, people: [...NOV_2026_CONFIG.people].reverse() };
    expect(templatePeople([reordered], PEOPLE).map((p) => p.personId)).toEqual([priya, jordan, sam]);
  });

  it("keeps someone leaving next month, with this month's config", () => {
    const next = without(NOV_2026_CONFIG, jordan);
    const people = templatePeople([next, NOV_2026_CONFIG], PEOPLE);
    expect(people.map((p) => p.personId)).toEqual([priya, sam, jordan]);
    expect(people.find((p) => p.personId === sam)?.config).toBe(next);
    expect(people.find((p) => p.personId === jordan)?.config).toBe(NOV_2026_CONFIG);
  });

  it("falls back when a Person row is missing", () => {
    const [first] = templatePeople([NOV_2026_CONFIG], []);
    expect(first).toMatchObject({ name: "Someone", initial: "S", color: "SLATE" });
  });
});

describe("defaultPreviewPerson", () => {
  it("is the primary tenant, else the first tenant, else nobody", () => {
    expect(defaultPreviewPerson(templatePeople([NOV_2026_CONFIG], PEOPLE))?.personId).toBe(priya);
    expect(defaultPreviewPerson(templatePeople([without(NOV_2026_CONFIG, priya)], PEOPLE))?.personId).toBe(sam);
    expect(defaultPreviewPerson([])).toBeUndefined();
  });
});
