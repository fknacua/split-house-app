import {
  householdConfigSchema,
  householdViewResponseSchema,
  type HouseholdConfig,
  type PersonColor,
} from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS, ROOM_IDS } from "@/lib/fixtures/household";
import { buildHouseholdView, type HouseholdViewInput } from "./build-household-view";

const { alex, priya, sam, jordan } = PERSON_IDS;

const PEOPLE: HouseholdViewInput["people"] = [
  { id: alex, name: "Alex", color: "TEAL" },
  { id: priya, name: "Priya", color: "BLUE" },
  { id: sam, name: "Sam", color: "ORANGE" },
  { id: jordan, name: "Jordan", color: "GREEN" },
];

/** A segment as drawn, in `[name, value, percent, color]` form. */
function segmentsOf(view: ReturnType<typeof buildHouseholdView>, label: string): [string, string, number, PersonColor][] {
  const row = view.splitRows.find((r) => r.label === label);
  if (!row) throw new Error(`no ${label} row`);
  return row.segments.map((s) => [s.name, s.value, s.percent, s.color]);
}

function input(overrides: Partial<HouseholdViewInput> = {}): HouseholdViewInput {
  return {
    month: "2026-11",
    activeMonth: "2026-11",
    versionMonths: ["2026-08", "2026-11"],
    config: NOV_2026_CONFIG,
    nextConfig: NOV_2026_CONFIG,
    editablePersonIds: new Set([alex, priya, sam, jordan]),
    people: PEOPLE,
    ...overrides,
  };
}

/** The November config with some of its categories replaced. */
function withCategories(categories: Partial<HouseholdConfig["categories"]>): HouseholdConfig {
  return { ...NOV_2026_CONFIG, categories: { ...NOV_2026_CONFIG.categories, ...categories } };
}

function card(view: ReturnType<typeof buildHouseholdView>, personId: string) {
  const found = view.people.find((p) => p.personId === personId);
  if (!found) throw new Error(`no card for ${personId}`);
  return found;
}

describe("buildHouseholdView", () => {
  it("has no buttons for someone not in the household next month", () => {
    const view = buildHouseholdView(input({ editablePersonIds: new Set([alex, priya, sam]) }));
    expect(card(view, jordan).actions).toEqual([]);
    expect(card(view, sam).actions.map((a) => a.label)).toEqual(["View", "Edit"]);
  });

  it("parses with the shared schema", () => {
    expect(() => householdViewResponseSchema.parse(buildHouseholdView(input()))).not.toThrow();
  });

  it("shows the landlord rent, its due day and the stats on the card", () => {
    expect(buildHouseholdView(input()).landlord).toEqual({
      label: "Landlord rent · due 1st of the month",
      amount: "$4,300.00",
      stats: [
        { value: "3", label: "rooms" },
        { value: "6", label: "aircon units" },
        { value: "5", label: "utility shares" },
      ],
      edit: { label: "Edit", target: { kind: "edit-home" } },
    });
  });

  it("lists the primary tenant, then the tenants, then the owner as You", () => {
    const view = buildHouseholdView(input());
    expect(view.people.map((p) => p.name)).toEqual(["Priya", "Sam", "Jordan", "You"]);
    expect(view.people.map((p) => p.initial)).toEqual(["P", "S", "J", "Y"]);
    expect(view.people.map((p) => p.color)).toEqual(["BLUE", "ORANGE", "GREEN", "TEAL"]);
  });

  it("builds the primary tenant's card from the split", () => {
    const priyaCard = card(buildHouseholdView(input()), priya);
    expect(priyaCard.facts).toEqual([
      { label: "Rent · due 7th", value: "$1,675.00" },
      { label: "Utilities · due 7th", value: "1.5 shares" },
    ]);
    expect(priyaCard.actions).toEqual([
      { label: "View", target: { kind: "view-person", personId: priya } },
      { label: "Edit", target: { kind: "edit-person", personId: priya } },
    ]);
  });

  it("uses the Via person's due day, with no sub line", () => {
    const samCard = card(buildHouseholdView(input()), sam);
    expect(samCard).not.toHaveProperty("sub");
    expect(samCard.facts).toEqual([
      { label: "Rent · due 28th", value: "$950.00" },
      { label: "Utilities · due 7th", value: "1 share" },
    ]);
    expect(samCard.actions).toEqual([
      { label: "View", target: { kind: "view-person", personId: sam } },
      { label: "Edit", target: { kind: "edit-person", personId: sam } },
    ]);
  });

  it("shows a tenant's own rent and utilities, with no savings copy", () => {
    const view = buildHouseholdView(input());
    expect(card(view, jordan).facts).toEqual([
      { label: "Rent · due 1st", value: "$950.00" },
      { label: "Utilities · due 4th", value: "1 share" },
    ]);
    expect(JSON.stringify(view).toLowerCase()).not.toContain("savings");
  });

  it("builds the owner's card, with no buttons", () => {
    const you = card(buildHouseholdView(input()), alex);
    expect(you.facts).toEqual([
      { label: "Rent share", value: "$1,675.00" },
      { label: "Utilities", value: "1.5 shares" },
    ]);
    expect(you.actions).toEqual([]);
  });

  it("writes the split rows across everyone, the owner first", () => {
    const view = buildHouseholdView(input());
    expect(view.splitRows.map((r) => [r.label, r.detail])).toEqual([
      ["Rent", "$4,300.00"],
      ["Utilities", "5 shares"],
      ["Aircon", "6 units"],
    ]);
    expect(segmentsOf(view, "Rent")).toEqual([
      ["You", "$1,675.00", 39, "TEAL"],
      ["Priya", "$1,675.00", 39, "BLUE"],
      ["Sam", "$950.00", 22.1, "ORANGE"],
      ["Jordan", "$950.00", 0, "GREEN"],
    ]);
    expect(segmentsOf(view, "Utilities")).toEqual([
      ["You", "1.5", 30, "TEAL"],
      ["Priya", "1.5", 30, "BLUE"],
      ["Sam", "1", 20, "ORANGE"],
      ["Jordan", "1", 20, "GREEN"],
    ]);
    expect(segmentsOf(view, "Aircon")).toEqual([
      ["You", "2", 33.3, "TEAL"],
      ["Priya", "2", 33.3, "BLUE"],
      ["Sam", "1", 16.7, "ORANGE"],
      ["Jordan", "1", 16.7, "GREEN"],
    ]);
    expect(view.splitRows[1].accessibilityLabel).toBe("Utilities: You 1.5, Priya 1.5, Sam 1, Jordan 1");
  });

  it("leaves a tenant not in the total out of the Rent bar and total, and only the Rent row", () => {
    const view = buildHouseholdView(input());
    const [rentRow, utilitiesRow, airconRow] = view.splitRows;
    expect(rentRow.note).toBe("Not in total: Jordan");
    expect(rentRow.segments.map((s) => [s.name, s.inTotal])).toEqual([
      ["You", true],
      ["Priya", true],
      ["Sam", true],
      ["Jordan", false],
    ]);
    expect(rentRow.accessibilityLabel).toBe(
      "Rent: You $1,675.00, Priya $1,675.00, Sam $950.00, Jordan $950.00 (not in total)",
    );
    expect(utilitiesRow.note).toBeNull();
    expect(airconRow.note).toBeNull();
    expect(utilitiesRow.segments.every((s) => s.inTotal)).toBe(true);
    expect(airconRow.segments.every((s) => s.inTotal)).toBe(true);
  });

  it("has no note when every tenant is in the total, and the row still adds up to the landlord rent", () => {
    const config = {
      ...NOV_2026_CONFIG,
      rooms: NOV_2026_CONFIG.rooms.map((r) => (r.id === ROOM_IDS.room3 ? { ...r, includeInTotal: true } : r)),
    };
    const [rentRow] = buildHouseholdView(input({ config })).splitRows;
    expect(rentRow.note).toBeNull();
    expect(rentRow.detail).toBe("$4,300.00");
    expect(rentRow.segments.map((s) => s.value)).toEqual(["$1,200.00", "$1,200.00", "$950.00", "$950.00"]);
  });

  it("points Edit splits at the split page", () => {
    expect(buildHouseholdView(input()).editSplits).toEqual({ label: "Edit splits", target: { kind: "edit-splits" } });
  });

  it("follows an uneven split, on the rows and the cards", () => {
    const config = withCategories({
      rent: { landlordRentCents: 430000, landlordDueDay: 1, ownerBps: 6000, primaryBps: 4000 },
      utilities: { totalShares: 5000, ownerBps: 6000, primaryBps: 4000, billDueDay: 16 },
      aircon: { ownerBps: 6667, primaryBps: 3333 },
    });
    const view = buildHouseholdView(input({ config }));
    expect(segmentsOf(view, "Rent").slice(0, 2).map((s) => s[1])).toEqual(["$2,010.00", "$1,340.00"]);
    expect(segmentsOf(view, "Utilities").slice(0, 2).map((s) => s[1])).toEqual(["1.8", "1.2"]);
    expect(segmentsOf(view, "Aircon").slice(0, 2).map((s) => s[1])).toEqual(["2.667", "1.333"]);
    expect(card(view, priya).facts[0].value).toBe("$1,340.00");
    expect(card(view, alex).facts[0].value).toBe("$2,010.00");
  });

  it("lists fewer people in the split without a primary tenant", () => {
    const remainder = { ownerBps: 10000, primaryBps: 0 };
    const config = householdConfigSchema.parse({
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people
        .filter((p) => p.personId !== priya)
        .map((p) => (p.personId === sam ? { ...p, routes: {} } : p)),
      categories: {
        rent: { landlordRentCents: 430000, landlordDueDay: 1, ...remainder },
        utilities: { totalShares: 5000, ...remainder },
        aircon: remainder,
      },
      recurring: [],
    });
    const view = buildHouseholdView(input({ config }));
    expect(view.people.map((p) => p.name)).toEqual(["Sam", "Jordan", "You"]);
    expect(card(view, alex).facts[0].value).toBe("$3,350.00");
    expect(segmentsOf(view, "Rent").map((s) => s[0])).toEqual(["You", "Sam", "Jordan"]);
    expect(() => householdViewResponseSchema.parse(view)).not.toThrow();
  });

  it("keeps a person at zero in the row with a zero-width segment", () => {
    const config = {
      ...NOV_2026_CONFIG,
      rooms: NOV_2026_CONFIG.rooms.map((r) => (r.id === ROOM_IDS.room3 ? { ...r, airconUnits: 0 } : r)),
    };
    const jordanPart = segmentsOf(buildHouseholdView(input({ config })), "Aircon").find((s) => s[0] === "Jordan");
    expect(jordanPart).toEqual(["Jordan", "0", 0, "GREEN"]);
  });

  it("gives an empty room's rent and units to the owner and primary tenant", () => {
    const config = { ...NOV_2026_CONFIG, people: NOV_2026_CONFIG.people.filter((p) => p.personId !== sam) };
    const view = buildHouseholdView(input({ config }));
    expect(segmentsOf(view, "Rent").map((s) => [s[0], s[1]])).toEqual([
      ["You", "$2,150.00"],
      ["Priya", "$2,150.00"],
      ["Jordan", "$950.00"],
    ]);
    expect(segmentsOf(view, "Aircon").map((s) => [s[0], s[1]])).toEqual([
      ["You", "2.5"],
      ["Priya", "2.5"],
      ["Jordan", "1"],
    ]);
    expect(view.landlord.stats[1]).toEqual({ value: "6", label: "aircon units" });
  });

  it("lists only the owner and primary tenant when there are no tenants", () => {
    const config = {
      ...withCategories({}),
      people: NOV_2026_CONFIG.people.filter((p) => p.role !== "TENANT"),
    };
    expect(segmentsOf(buildHouseholdView(input({ config })), "Rent").map((s) => s[0])).toEqual(["You", "Priya"]);
  });

  it("leaves out a due day that is not set", () => {
    const config = {
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people.map((p) => (p.personId === jordan ? { ...p, dueDays: {} } : p)),
    };
    const labels = card(buildHouseholdView(input({ config })), jordan).facts.map((f) => f.label);
    expect(labels).toEqual(["Rent", "Utilities"]);
  });

  it("does not list someone who is not in the month's config", () => {
    const config = { ...NOV_2026_CONFIG, people: NOV_2026_CONFIG.people.filter((p) => p.personId !== jordan) };
    const newcomer: HouseholdViewInput["people"] = [...PEOPLE, { id: "person-new", name: "Casey", color: "PURPLE" }];
    const names = buildHouseholdView(input({ config, people: newcomer })).people.map((p) => p.name);
    expect(names).toEqual(["Priya", "Sam", "You"]);
  });

  describe("month list", () => {
    it("lists each version's month and the active month, newest first, marking only later ones upcoming", () => {
      const view = buildHouseholdView(input({ versionMonths: ["2026-08", "2026-11", "2027-01"] }));
      expect(view.monthLabel).toBe("Nov 2026");
      expect(view.monthOptions).toEqual([
        { month: "2027-01", label: "Jan 2027", badge: { label: "Upcoming", tone: "neutral" } },
        { month: "2026-11", label: "Nov 2026", badge: null },
        { month: "2026-08", label: "Aug 2026", badge: null },
      ]);
    });

    it("adds the active month when no version starts on it", () => {
      const view = buildHouseholdView(input({ month: "2026-12", activeMonth: "2026-12" }));
      expect(view.monthOptions.map((o) => o.month)).toEqual(["2026-12", "2026-11", "2026-08"]);
    });
  });
});
