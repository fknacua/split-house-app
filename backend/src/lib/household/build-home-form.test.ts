import { HOUSEHOLD_SCHEMA_VERSION, householdHomeFormResponseSchema, parseHouseholdConfig, type HouseholdConfig } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { JAN_2027_CONFIG, NOV_2026_CONFIG, PERSON_IDS, ROOM_IDS } from "@/lib/fixtures/household";
import { applyRemovePerson } from "./apply-edit";
import { buildHomeForm } from "./build-home-form";

const PEOPLE = [
  { id: PERSON_IDS.alex, name: "Alex" },
  { id: PERSON_IDS.priya, name: "Priya" },
  { id: PERSON_IDS.sam, name: "Sam" },
  { id: PERSON_IDS.jordan, name: "Jordan" },
];

const form = (config: HouseholdConfig = NOV_2026_CONFIG, activeConfig: HouseholdConfig | null = config) =>
  householdHomeFormResponseSchema.parse(buildHomeForm({ month: "2026-12", config, activeConfig, people: PEOPLE }));

const room = (body: ReturnType<typeof form>, id: string) => body.rooms.find((r) => r.id === id);

describe("buildHomeForm", () => {
  it("gives the headings and the landlord values", () => {
    const body = form();
    expect(body).toMatchObject({
      title: "Landlord & rooms",
      sub: "Rent you pay the landlord",
      datedTitle: "From December 2026",
      pendingNote: null,
      values: { landlordRentCents: 430000, landlordDueDay: 1, billDueDay: 16 },
    });
  });

  it("has null for a bill due day that isn't set", () => {
    const utilities = { ...NOV_2026_CONFIG.categories.utilities };
    delete utilities.billDueDay;
    const config = { ...NOV_2026_CONFIG, categories: { ...NOV_2026_CONFIG.categories, utilities } };
    expect(form(config).values.billDueDay).toBeNull();
  });

  it("draws the master room with its calculated rent and no remove", () => {
    expect(room(form(), ROOM_IDS.master)).toEqual({
      id: ROOM_IDS.master,
      roomType: "MASTER",
      title: "Master room",
      name: "Master room",
      airconUnits: 1,
      rentCents: null,
      includeInTotal: null,
      calculatedRent: "$3,350.00",
      occupants: "You + Priya",
      badge: null,
      canRemove: false,
    });
  });

  it("reads You in Shared by until a primary tenant exists", () => {
    const config = { ...NOV_2026_CONFIG, people: NOV_2026_CONFIG.people.filter((p) => p.personId !== PERSON_IDS.priya) };
    expect(room(form(config), ROOM_IDS.master)?.occupants).toBe("You");
  });

  it("draws an occupied tenant room with its tenant and no remove", () => {
    expect(room(form(), ROOM_IDS.room2)).toMatchObject({
      title: "Tenant room",
      rentCents: 95000,
      includeInTotal: true,
      calculatedRent: null,
      occupants: "Sam",
      badge: null,
      canRemove: false,
    });
  });

  it("marks an empty tenant room, which keeps its rent and can go", () => {
    const empty = room(form(applyRemovePerson(NOV_2026_CONFIG, PERSON_IDS.jordan)), ROOM_IDS.room3);
    expect(empty).toMatchObject({
      rentCents: 95000,
      includeInTotal: false,
      occupants: null,
      badge: { label: "Empty", tone: "neutral" },
      canRemove: true,
    });
  });

  it("draws a common room with units only, and it can go", () => {
    expect(room(form(), ROOM_IDS.living)).toMatchObject({
      title: "Common room",
      airconUnits: 2,
      rentCents: null,
      includeInTotal: null,
      calculatedRent: null,
      occupants: null,
      badge: null,
      canRemove: true,
    });
  });

  it("keeps the types together, whatever order they were added in", () => {
    const added = { id: "room-new", roomType: "TENANT" as const, name: "Room 4", airconUnits: 1, rentCents: 80000, includeInTotal: true };
    const config = parseHouseholdConfig(HOUSEHOLD_SCHEMA_VERSION, { ...NOV_2026_CONFIG, rooms: [...NOV_2026_CONFIG.rooms, added] });
    expect(form(config).rooms.map((r) => r.id)).toEqual([
      ROOM_IDS.master,
      ROOM_IDS.room2,
      ROOM_IDS.room3,
      "room-new",
      ROOM_IDS.living,
      ROOM_IDS.utility,
    ]);
  });

  it("notes when a room's values differ from the active month's", () => {
    expect(form(JAN_2027_CONFIG, NOV_2026_CONFIG).pendingNote).toBe("These take effect from December 2026.");
  });

  it("notes when a landlord value differs", () => {
    const config = {
      ...NOV_2026_CONFIG,
      categories: {
        ...NOV_2026_CONFIG.categories,
        rent: { ...NOV_2026_CONFIG.categories.rent, landlordRentCents: 440000 },
      },
    };
    expect(form(config, NOV_2026_CONFIG).pendingNote).toBe("These take effect from December 2026.");
  });

  it("notes when a room is empty only from next month", () => {
    expect(form(applyRemovePerson(NOV_2026_CONFIG, PERSON_IDS.jordan), NOV_2026_CONFIG).pendingNote).toBe(
      "These take effect from December 2026.",
    );
  });

  it("has no note for a change this screen doesn't show", () => {
    const config = { ...NOV_2026_CONFIG, recurring: [] };
    expect(form(config, NOV_2026_CONFIG).pendingNote).toBeNull();
  });
});
