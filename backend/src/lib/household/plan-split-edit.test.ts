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
      utilitiesPrimaryBps: 5000,
      airconPrimaryBps: 5000,
    });
    expect(result).toEqual({
      nextConfig: null,
      groups: [],
      errors: {},
      warnings: {},
      canSave: false,
      amounts: {
        rent: { left: "$3,350.00", owner: "$1,675.00", primary: "$1,675.00" },
        utilities: { left: "3", owner: "1.5 shares", primary: "1.5 shares" },
        aircon: { left: "4", owner: "2 units", primary: "2 units" },
      },
    });
  });

  it("matches the changed board: the split moves and the owner takes the rest", () => {
    // You at 60% is Priya at 40%.
    const result = plan({ utilitiesPrimaryBps: 4000 });
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
    expect(result.amounts.utilities).toEqual({ left: "3", owner: "1.8 shares", primary: "1.2 shares" });
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
    expect(result.amounts.utilities).toEqual({ left: "4", owner: "2 shares", primary: "2 shares" });
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
    expect(result.amounts.utilities).toEqual({ left: "0", owner: "—", primary: "—" });
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
    expect(plan({ totalShares: 4000 }, config).amounts.utilities).toEqual({ left: "2", owner: "2 shares", primary: null });
  });

  it("changes the total, with the people left following", () => {
    expect(rowsOf(plan({ totalShares: 6000 }))).toEqual([
      { label: "Total shares", from: "5", to: "6" },
      { label: "You · utilities", from: "1.5", to: "2" },
      { label: "Priya · utilities", from: "1.5", to: "2" },
    ]);
  });

  it("shows rent as money and aircon as units", () => {
    expect(rowsOf(plan({ rentPrimaryBps: 4000, airconPrimaryBps: 2500 }))).toEqual([
      { label: "You · rent", from: "$1,675.00", to: "$2,010.00" },
      { label: "Priya · rent", from: "$1,675.00", to: "$1,340.00" },
      { label: "You · aircon", from: "2", to: "3" },
      { label: "Priya · aircon", from: "2", to: "1" },
    ]);
  });

  it.each([
    ["an empty percent", null],
    ["below 1%", 99],
    ["above 99%", 9901],
    ["0%", 0],
  ])("refuses %s", (_name, bps) => {
    expect(plan({ rentPrimaryBps: bps }).errors).toEqual({ rentPrimaryBps: "Enter a percentage" });
  });

  it.each([100, 9900])("allows %i basis points", (bps) => {
    expect(plan({ rentPrimaryBps: bps })).toMatchObject({ errors: {}, canSave: true });
  });

  it.each([
    ["empty", null, "Enter the total shares"],
    ["0", 0, "Enter the total shares"],
    ["below zero", -1, "Enter 0 or more."],
  ])("refuses a total that is %s", (_name, totalShares, message) => {
    expect(plan({ totalShares }).errors).toEqual({ totalShares: message });
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
