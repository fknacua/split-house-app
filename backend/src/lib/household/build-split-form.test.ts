import { householdSplitFormResponseSchema, type HouseholdConfig, type PersonColor } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS, ROOM_IDS } from "@/lib/fixtures/household";
import { applyRemovePerson, applySplitEdit } from "./apply-edit";
import { buildSplitForm } from "./build-split-form";

const PEOPLE: { id: string; name: string; color: PersonColor }[] = [
  { id: PERSON_IDS.alex, name: "Alex", color: "TEAL" },
  { id: PERSON_IDS.priya, name: "Priya", color: "BLUE" },
  { id: PERSON_IDS.sam, name: "Sam", color: "ORANGE" },
  { id: PERSON_IDS.jordan, name: "Jordan", color: "GREEN" },
];

const form = (config: HouseholdConfig = NOV_2026_CONFIG, activeConfig: HouseholdConfig | null = NOV_2026_CONFIG) =>
  householdSplitFormResponseSchema.parse(buildSplitForm({ month: "2026-12", config, activeConfig, people: PEOPLE }));

describe("buildSplitForm", () => {
  it("matches the unchanged board", () => {
    expect(form()).toEqual({
      title: "Household split",
      datedTitle: "From December 2026",
      pendingNote: null,
      splitTitle: "Split between you and Priya",
      owner: { name: "You", color: "TEAL" },
      primary: { name: "Priya", color: "BLUE" },
      values: {
        tenantShares: [
          { personId: PERSON_IDS.sam, name: "Sam", color: "ORANGE", utilityShares: 1000 },
          { personId: PERSON_IDS.jordan, name: "Jordan", color: "GREEN", utilityShares: 1000 },
        ],
        totalShares: 5000,
        rentPrimaryBps: 5000,
      },
      rent: {
        title: "Rent (SGD)",
        rows: [
          { personId: PERSON_IDS.sam, name: "Sam · Room 2", color: "ORANGE", value: "$950.00", inTotal: true },
          { personId: PERSON_IDS.jordan, name: "Jordan · Room 3", color: "GREEN", value: "$950.00", inTotal: false },
        ],
        leftLabel: "Shared rent",
      },
      utilities: { title: "Utilities (shares)", totalLabel: "Total shares", leftLabel: "Left to split" },
      aircon: {
        title: "Aircon (units)",
        rows: [
          { personId: PERSON_IDS.sam, name: "Sam · Room 2", color: "ORANGE", value: "1", inTotal: true },
          { personId: PERSON_IDS.jordan, name: "Jordan · Room 3", color: "GREEN", value: "1", inTotal: true },
        ],
        leftLabel: "Left to split",
        totalLabel: "Total units",
        total: "6",
      },
      amounts: {
        rent: { left: "$3,350.00", owner: "$1,675.00", primary: "$1,675.00" },
        utilities: { left: "3", owner: "1.5 shares", primary: "1.5 shares", counts: { left: 3000, owner: 1500, primary: 1500 } },
        aircon: { left: "4", owner: "2 units", primary: "2 units", counts: { left: 4000, owner: 2000, primary: 2000 } },
      },
    });
  });

  it("shows the note while a saved split differs from the active month's", () => {
    const next = applySplitEdit(NOV_2026_CONFIG, { kind: "split", tenantShares: [], utilitiesPrimaryShares: 1200 });
    expect(form(next).pendingNote).toBe("These take effect from December 2026.");
  });

  it("shows the note while a room this screen shows differs", () => {
    const next: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      rooms: NOV_2026_CONFIG.rooms.map((room) => (room.id === ROOM_IDS.room2 ? { ...room, airconUnits: 2 } : room)),
    };
    expect(form(next).pendingNote).toBe("These take effect from December 2026.");
  });

  it("has no note for a change this screen doesn't show", () => {
    const next: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people.map((p) => (p.personId === PERSON_IDS.jordan ? { ...p, depositCents: 0 } : p)),
    };
    expect(form(next).pendingNote).toBeNull();
  });

  it("drops a removed tenant's rows, and the room's units go to the split", () => {
    const body = form(applyRemovePerson(NOV_2026_CONFIG, PERSON_IDS.jordan));
    expect(body.rent.rows.map((row) => row.personId)).toEqual([PERSON_IDS.sam]);
    expect(body.amounts.aircon.left).toBe("5");
  });

  it("leaves the split control out with no primary tenant", () => {
    const body = form({
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people.filter((p) => p.role !== "PRIMARY"),
    });
    expect(body.splitTitle).toBeNull();
    expect(body.primary).toBeNull();
    expect(body.amounts.rent.primary).toBeNull();
  });

  it("leaves out the heading above the cards in First run", () => {
    const body = buildSplitForm({ month: "2026-12", config: NOV_2026_CONFIG, activeConfig: NOV_2026_CONFIG, people: PEOPLE, firstSetup: true });
    expect(householdSplitFormResponseSchema.parse(body).datedTitle).toBeNull();
  });
});
