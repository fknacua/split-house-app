import { householdRecurringSchema, type HouseholdConfig } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { buildRecurringSection, type RecurringSectionInput } from "./build-recurring-section";

const { alex, priya, sam, jordan } = PERSON_IDS;
const NAMES = new Map([
  [alex, "Alex"],
  [priya, "Priya"],
  [sam, "Sam"],
  [jordan, "Jordan"],
]);

const build = (overrides: Partial<RecurringSectionInput> = {}) =>
  householdRecurringSchema.parse(
    buildRecurringSection({
      month: "2026-11",
      activeMonth: "2026-11",
      config: NOV_2026_CONFIG,
      nextConfig: NOV_2026_CONFIG,
      names: NAMES,
      colors: new Map([[priya, "BLUE"]]),
      ...overrides,
    }),
  );

const withRecurring = (recurring: HouseholdConfig["recurring"]): HouseholdConfig => ({ ...NOV_2026_CONFIG, recurring });

describe("buildRecurringSection", () => {
  it("shows a charge on a card like a person's: the payer's avatar and name, the charge, the amount and an Edit button", () => {
    expect(build().rows).toEqual([
      {
        chargeId: "recurring-starhub",
        initial: "P",
        name: "Priya",
        color: "BLUE",
        facts: [
          { label: "Charge", value: "Starhub" },
          { label: "Amount · due 7th", value: "$27.50" },
        ],
        actions: [{ label: "Edit", target: { kind: "edit-recurring", chargeId: "recurring-starhub" } }],
      },
    ]);
  });

  it("reads the payer's day for someone paying via them", () => {
    const config = withRecurring([{ id: "c", label: "Parking", amountCents: 1000, personId: sam }]);
    expect(build({ config, nextConfig: config }).rows[0].facts[1].label).toBe("Amount · due 7th");
  });

  it("shows the end month, and drops the charge after it", () => {
    const config = withRecurring([{ id: "c", label: "Parking", amountCents: 1000, personId: jordan, endMonth: "2027-03" }]);
    expect(build({ config, nextConfig: config }).rows[0].facts.at(-1)).toEqual({ label: "Until", value: "Mar 2027" });
    expect(build({ month: "2027-04", config, nextConfig: config }).rows).toEqual([]);
  });

  it("has no Edit on a charge that stops by next month", () => {
    const body = build({ nextConfig: withRecurring([]) });
    expect(body.rows[0].actions).toEqual([]);
    expect(body.sheet.charges).toEqual([]);
  });

  it("labels the heading's button Add charge and the sheet in full", () => {
    const body = build();
    expect(body.add.label).toBe("Add charge");
    expect(body.sheet.addTitle).toBe("Add recurring charge");
  });

  it("has a note on the active month only while next month differs", () => {
    const nextConfig = withRecurring([]);
    expect(build().pendingNote).toBeNull();
    expect(build({ nextConfig }).pendingNote).toBe("Saved changes take effect from December 2026.");
    expect(build({ month: "2026-12", config: nextConfig, nextConfig }).pendingNote).toBeNull();
  });

  it("offers the primary tenant then the tenants, never the owner", () => {
    expect(build().sheet.people.map((p) => p.name)).toEqual(["Priya", "Sam", "Jordan"]);
  });

  it("offers end months from next month on", () => {
    const { endMonths } = build().sheet;
    expect(endMonths[0]).toBe("2026-12");
    expect(endMonths).toHaveLength(36);
  });

  it("writes the sheet's values and the remove dialog", () => {
    expect(build().sheet.charges).toEqual([
      {
        chargeId: "recurring-starhub",
        label: "Starhub",
        amountCents: 2750,
        personId: priya,
        endMonth: null,
        removeDialog: {
          title: "Remove Starhub?",
          body: "Starhub stops from December 2026. Past months stay as they are.",
        },
      },
    ]);
  });
});
