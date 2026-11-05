import { type HouseholdConfig, type HouseholdSplitEdit } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { applyRemovePerson } from "./apply-edit";
import { planSplitEdit } from "./plan-split-edit";

const NAMES = new Map([
  [PERSON_IDS.priya, "Priya"],
  [PERSON_IDS.sam, "Sam"],
  [PERSON_IDS.jordan, "Jordan"],
]);
const SAM = `tenantShares.${PERSON_IDS.sam}`;
const JORDAN = `tenantShares.${PERSON_IDS.jordan}`;

const plan = (fields: Partial<HouseholdSplitEdit> = {}, config: HouseholdConfig = NOV_2026_CONFIG) =>
  planSplitEdit({
    edit: { kind: "split", tenantShares: [], ...fields },
    names: NAMES,
    month: "2026-12",
    base: { startsFromMonth: "2026-11", config },
  });

const rowsOf = (result: ReturnType<typeof plan>) => result.groups.flatMap((g) => g.rows);

describe("planSplitEdit", () => {
  it("matches the unchanged board: nothing to save, and the amounts", () => {
    const result = plan({
      tenantShares: [
        { personId: PERSON_IDS.sam, utilityShares: 1000 },
        { personId: PERSON_IDS.jordan, utilityShares: 1000 },
      ],
      totalShares: 5000,
      rentPrimaryBps: 5000,
    });
    expect(result).toEqual({
      nextConfig: null,
      groups: [],
      errors: {},
      warnings: {},
      canSave: false,
      amounts: {
        rent: { left: "$3,350.00", owner: "$1,675.00", primary: "$1,675.00" },
        utilities: { left: "3", owner: "1.5 shares", primary: "1.5 shares", counts: { left: 3000, owner: 1500, primary: 1500 } },
        aircon: { left: "4", owner: "2 units", primary: "2 units", counts: { left: 4000, owner: 2000, primary: 2000 } },
      },
    });
  });

  it("matches the changed board: the split moves and the owner takes the rest", () => {
    // 1.2 of the 3 left is 40%, so You have 60%.
    const result = plan({ utilitiesPrimaryShares: 1200 });
    expect(result.groups).toEqual([
      {
        title: "Saves from Dec 2026",
        rows: [
          { label: "You · utilities", from: "1.5", to: "1.8" },
          { label: "Priya · utilities", from: "1.5", to: "1.2" },
        ],
      },
    ]);
    expect(result.canSave).toBe(true);
    expect(result.nextConfig?.categories.utilities).toMatchObject({ ownerBps: 6000, primaryBps: 4000, totalShares: 5000 });
    expect(result.amounts.utilities).toMatchObject({ left: "3", owner: "1.8 shares", primary: "1.2 shares" });
  });

  it("matches the warning board: a tenant at 0 warns, allows Save and the total stays", () => {
    const result = plan({ tenantShares: [{ personId: PERSON_IDS.sam, utilityShares: 0 }] });
    expect(result.warnings).toEqual({ [SAM]: "Sam utilities is 0" });
    expect(result.errors).toEqual({});
    expect(result.canSave).toBe(true);
    expect(rowsOf(result)).toEqual([
      { label: "Sam · utilities", from: "1", to: "0" },
      { label: "You · utilities", from: "1.5", to: "2" },
      { label: "Priya · utilities", from: "1.5", to: "2" },
    ]);
  });

  it("matches the error board: an empty field stops Save and still works out the amounts", () => {
    const result = plan({ tenantShares: [{ personId: PERSON_IDS.jordan, utilityShares: null }] });
    expect(result.errors).toEqual({ [JORDAN]: "Enter Jordan’s shares" });
    expect(result).toMatchObject({ groups: [], nextConfig: null, canSave: false });
    expect(result.amounts.utilities).toMatchObject({ left: "4", owner: "2 shares", primary: "2 shares" });
  });

  it("matches the all-shares board: nothing left, with dashes for the amounts", () => {
    const result = plan({
      tenantShares: [
        { personId: PERSON_IDS.sam, utilityShares: 3000 },
        { personId: PERSON_IDS.jordan, utilityShares: 2000 },
      ],
    });
    expect(result.errors).toEqual({ leftToSplit: "Nothing left to split between You and Priya" });
    expect(result.canSave).toBe(false);
    expect(result.amounts.utilities).toMatchObject({ left: "0", owner: "—", primary: "—" });
  });

  it("refuses tenants taking more than the total the same way", () => {
    const result = plan({ tenantShares: [{ personId: PERSON_IDS.sam, utilityShares: 9000 }] });
    expect(result.errors.leftToSplit).toBe("Nothing left to split between You and Priya");
    expect(result.amounts.utilities.left).toBe("0");
  });

  it("uses only you in the message with no primary tenant", () => {
    const config: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people.filter((p) => p.role !== "PRIMARY").map((p) => ({ ...p, routes: {} })),
      categories: {
        ...NOV_2026_CONFIG.categories,
        rent: { ...NOV_2026_CONFIG.categories.rent, ownerBps: 10000, primaryBps: 0 },
        utilities: { ...NOV_2026_CONFIG.categories.utilities, ownerBps: 10000, primaryBps: 0 },
        aircon: { ownerBps: 10000, primaryBps: 0 },
      },
    };
    expect(plan({ totalShares: 2000 }, config).errors).toEqual({ leftToSplit: "Nothing left for you" });
    expect(plan({ rentPrimaryBps: 5000 }, config).errors).toEqual({ form: "There is no primary tenant to split with." });
    expect(plan({ totalShares: 4000 }, config).amounts.utilities).toMatchObject({ left: "2", owner: "2 shares", primary: null });
  });

  it("changes the total, with the people left following", () => {
    expect(rowsOf(plan({ totalShares: 6000 }))).toEqual([
      { label: "Total shares", from: "5", to: "6" },
      { label: "You · utilities", from: "1.5", to: "2" },
      { label: "Priya · utilities", from: "1.5", to: "2" },
    ]);
  });

  it("shows rent as money and aircon as units", () => {
    expect(rowsOf(plan({ rentPrimaryBps: 4000, airconPrimaryUnits: 1000 }))).toEqual([
      { label: "You · rent", from: "$1,675.00", to: "$2,010.00" },
      { label: "Priya · rent", from: "$1,675.00", to: "$1,340.00" },
      { label: "You · aircon", from: "2", to: "3" },
      { label: "Priya · aircon", from: "2", to: "1" },
    ]);
  });

  it.each([
    ["an empty percent", null],
    ["below 0%", -100],
    ["above 100%", 10100],
  ])("refuses %s", (_name, bps) => {
    expect(plan({ rentPrimaryBps: bps }).errors).toEqual({ rentPrimaryBps: "Enter a percentage" });
  });

  it.each([0, 100, 9900, 10000])("allows %i basis points", (bps) => {
    expect(plan({ rentPrimaryBps: bps })).toMatchObject({ errors: {}, canSave: true });
  });

  describe("someone at 0", () => {
    it("warns about the primary tenant's rent, allows Save and gives the owner all of it", () => {
      const result = plan({ rentPrimaryBps: 0 });
      expect(result.warnings).toEqual({ rentPrimaryBps: "Priya rent is 0" });
      expect(result.canSave).toBe(true);
      expect(result.amounts.rent).toEqual({ left: "$3,350.00", owner: "$3,350.00", primary: "$0.00" });
      expect(result.nextConfig?.categories.rent).toMatchObject({ ownerBps: 10000, primaryBps: 0 });
    });

    it("warns about the owner's rent the same way", () => {
      const result = plan({ rentPrimaryBps: 10000 });
      expect(result.warnings).toEqual({ rentPrimaryBps: "Your rent is 0" });
      expect(result.amounts.rent).toEqual({ left: "$3,350.00", owner: "$0.00", primary: "$3,350.00" });
    });

    it("matches dragging utilities all the way to the left: 0 and 3 shares", () => {
      const result = plan({ utilitiesPrimaryShares: 3000 });
      expect(result.warnings).toEqual({ utilitiesPrimaryShares: "Your utilities is 0" });
      expect(result.errors).toEqual({});
      expect(result.canSave).toBe(true);
      expect(result.amounts.utilities.counts).toEqual({ left: 3000, owner: 0, primary: 3000 });
      expect(result.nextConfig?.categories.utilities).toMatchObject({ ownerBps: 0, primaryBps: 10000 });
    });

    it("matches dragging utilities all the way to the right: 3 and 0 shares", () => {
      const result = plan({ utilitiesPrimaryShares: 0 });
      expect(result.warnings).toEqual({ utilitiesPrimaryShares: "Priya utilities is 0" });
      expect(result.amounts.utilities.counts).toEqual({ left: 3000, owner: 3000, primary: 0 });
    });

    it("warns on a saved 0 too, as it does for a tenant", () => {
      const saved: HouseholdConfig = {
        ...NOV_2026_CONFIG,
        categories: { ...NOV_2026_CONFIG.categories, aircon: { ownerBps: 10000, primaryBps: 0 } },
      };
      expect(plan({}, saved)).toMatchObject({ warnings: { airconPrimaryUnits: "Priya aircon is 0" }, canSave: false });
    });

    it("has no warning at nothing to split, or on a field with an error", () => {
      const result = plan({ utilitiesPrimaryShares: 3500, rentPrimaryBps: null });
      expect(result.warnings).toEqual({});
    });
  });

  describe("typed aircon counts", () => {
    it("stores whole counts as a percent, and warns at 0", () => {
      const result = plan({ airconPrimaryUnits: 4000 });
      expect(result.nextConfig?.categories.aircon).toEqual({ ownerBps: 0, primaryBps: 10000 });
      expect(result.amounts.aircon.counts).toEqual({ left: 4000, owner: 0, primary: 4000 });
      expect(result.warnings).toEqual({ airconPrimaryUnits: "Your aircon is 0" });
    });

    it("has nothing to save when the count matches the saved split", () => {
      expect(plan({ airconPrimaryUnits: 2000 })).toMatchObject({ nextConfig: null, errors: {}, canSave: false });
    });

    it.each([
      ["empty", null, "Enter the units"],
      ["more than is left", 4500, "Only 4 left to split"],
      ["below zero", -500, "Only 4 left to split"],
    ])("refuses a count that is %s", (_name, units, message) => {
      expect(plan({ airconPrimaryUnits: units }).errors).toEqual({ airconPrimaryUnits: message });
    });

    it("refuses any units when none are left to split", () => {
      const allInTenantRooms: HouseholdConfig = {
        ...NOV_2026_CONFIG,
        rooms: NOV_2026_CONFIG.rooms.map((room) =>
          room.roomType === "TENANT" ? room : { ...room, airconUnits: 0 },
        ),
      };
      expect(plan({ airconPrimaryUnits: 1000 }, allInTenantRooms).errors).toEqual({ airconPrimaryUnits: "Only 0 left to split" });
      expect(plan({ airconPrimaryUnits: 0 }, allInTenantRooms).errors).toEqual({});
    });
  });

  it.each([
    ["empty", null, "Enter the total shares"],
    ["0", 0, "Enter the total shares"],
    ["below zero", -1, "Enter 0 or more."],
  ])("refuses a total that is %s", (_name, totalShares, message) => {
    expect(plan({ totalShares }).errors).toEqual({ totalShares: message });
  });

  describe("typed utilities counts", () => {
    it("stores whole counts as a percent that gives them back", () => {
      const result = plan({ utilitiesPrimaryShares: 1000 });
      expect(result.nextConfig?.categories.utilities).toMatchObject({ primaryBps: 3333, ownerBps: 6667 });
      expect(result.amounts.utilities.counts).toEqual({ left: 3000, owner: 2000, primary: 1000 });
      expect(rowsOf(result)).toEqual([
        { label: "You · utilities", from: "1.5", to: "2" },
        { label: "Priya · utilities", from: "1.5", to: "1" },
      ]);
    });

    it.each([1234, 1800, 2500])("gives back %i thousandths exactly", (shares) => {
      expect(plan({ utilitiesPrimaryShares: shares }).amounts.utilities.counts.primary).toBe(shares);
    });

    it("has nothing to save when the count matches the saved split", () => {
      expect(plan({ utilitiesPrimaryShares: 1500 })).toMatchObject({ nextConfig: null, errors: {}, canSave: false });
    });

    it("keeps a typed count when a tenant's shares change, and the owner takes the rest", () => {
      const result = plan({ utilitiesPrimaryShares: 1000, tenantShares: [{ personId: PERSON_IDS.sam, utilityShares: 0 }] });
      expect(result.amounts.utilities.counts).toEqual({ left: 4000, owner: 3000, primary: 1000 });
    });

    it("lets both parts follow what is left when no count is typed", () => {
      const result = plan({ tenantShares: [{ personId: PERSON_IDS.sam, utilityShares: 0 }] });
      expect(result.amounts.utilities.counts).toEqual({ left: 4000, owner: 2000, primary: 2000 });
    });

    it.each([
      ["empty", null, "Enter the shares"],
      ["more than is left", 3500, "Only 3 left to split"],
      ["below zero, from typing too much for You", -500, "Only 3 left to split"],
    ])("refuses a count that is %s", (_name, shares, message) => {
      const result = plan({ utilitiesPrimaryShares: shares });
      expect(result.errors).toEqual({ utilitiesPrimaryShares: message });
      expect(result.canSave).toBe(false);
    });

    it("answers only that nothing is left when tenants take every share", () => {
      const result = plan({
        utilitiesPrimaryShares: 1000,
        tenantShares: [{ personId: PERSON_IDS.sam, utilityShares: 4000 }],
      });
      expect(Object.keys(result.errors)).toEqual(["leftToSplit"]);
      expect(result.amounts.utilities.counts).toEqual({ left: 0, owner: 0, primary: 0 });
    });
  });

  it("refuses shares below zero", () => {
    expect(plan({ tenantShares: [{ personId: PERSON_IDS.sam, utilityShares: -1 }] }).errors[SAM]).toBe("Enter 0 or more.");
  });

  it.each([PERSON_IDS.priya, PERSON_IDS.alex, "person-nobody"])("refuses shares for %s, who is not a tenant", (personId) => {
    expect(plan({ tenantShares: [{ personId, utilityShares: 1000 }] }).errors.form).toBe(
      "This person is no longer a tenant in the household.",
    );
  });

  it("leaves a due day as it is when shares go to 0", () => {
    const { nextConfig } = plan({ tenantShares: [{ personId: PERSON_IDS.jordan, utilityShares: 0 }] });
    expect(nextConfig?.people.find((p) => p.personId === PERSON_IDS.jordan)?.dueDays).toEqual({ RENT: 1, UTILITIES: 4, AIRCON: 4 });
  });

  it("works with a tenant gone from the version", () => {
    const config = applyRemovePerson(NOV_2026_CONFIG, PERSON_IDS.jordan);
    expect(plan({ totalShares: config.categories.utilities.totalShares }, config).amounts.aircon.left).toBe("5");
  });
});
