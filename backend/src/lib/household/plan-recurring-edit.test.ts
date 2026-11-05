import type { HouseholdConfig, HouseholdRecurringEdit } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { planRecurringEdit, planRemoveRecurring, runningCharges } from "./plan-recurring-edit";

const { alex, priya, jordan } = PERSON_IDS;
const STARHUB = "recurring-starhub";
const NAMES = new Map([
  [alex, "Alex"],
  [priya, "Priya"],
  [jordan, "Jordan"],
]);

const plan = (edit: Partial<HouseholdRecurringEdit>, config: HouseholdConfig = NOV_2026_CONFIG) =>
  planRecurringEdit({
    edit: { kind: "recurring", chargeId: null, label: "Parking", amountCents: 1000, personId: jordan, endMonth: null, ...edit },
    names: NAMES,
    month: "2026-12",
    base: { startsFromMonth: "2026-11", config },
    newChargeId: "new-charge",
  });

/** An edit to the saved charge, changing only what is passed. */
const planSaved = (edit: Partial<HouseholdRecurringEdit>) =>
  plan({ chargeId: STARHUB, label: "Starhub", amountCents: 2750, personId: priya, ...edit });

describe("runningCharges", () => {
  const withEnd = (endMonth: string): HouseholdConfig => ({
    ...NOV_2026_CONFIG,
    recurring: [{ id: "c", label: "Parking", amountCents: 1000, personId: jordan, endMonth }],
  });

  it("keeps a charge through its end month and drops it after", () => {
    expect(runningCharges(withEnd("2026-12"), "2026-12")).toHaveLength(1);
    expect(runningCharges(withEnd("2026-12"), "2027-01")).toHaveLength(0);
  });
});

describe("planRecurringEdit", () => {
  it("adds a charge with no summary, since the sheet is the summary", () => {
    const result = plan({});
    expect(result.canSave).toBe(true);
    expect(result.groups).toEqual([]);
    expect(result.nextConfig?.recurring.at(-1)).toEqual({ id: "new-charge", label: "Parking", amountCents: 1000, personId: jordan });
  });

  it("stays calm on an untouched new charge", () => {
    const result = plan({ label: "", amountCents: null, personId: null });
    expect(result.errors).toEqual({});
    expect(result.canSave).toBe(false);
    expect(result.nextConfig).toBeNull();
  });

  it("refuses a cleared field on a saved charge", () => {
    expect(planSaved({ label: "  " }).errors.label).toBe("Enter a label.");
    expect(planSaved({ amountCents: null }).errors.amountCents).toBe("Enter an amount.");
  });

  it.each([0, -100])("refuses an amount of %i", (amountCents) => {
    expect(plan({ amountCents }).errors.amountCents).toBe("Enter an amount.");
  });

  it("refuses the owner and anyone not in the version", () => {
    expect(plan({ personId: alex }).errors.personId).toBe("Choose someone.");
    expect(plan({ personId: "nobody" }).errors.personId).toBe("Choose someone.");
  });

  it("refuses an end month before next month and allows next month", () => {
    expect(plan({ endMonth: "2026-11" }).errors.endMonth).toBe("Choose next month or later.");
    expect(plan({ endMonth: "2026-12" }).nextConfig?.recurring.at(-1)?.endMonth).toBe("2026-12");
  });

  it("refuses a label the person's other charge has, ignoring case", () => {
    expect(plan({ label: "starhub", personId: priya }).errors.label).toBe("Priya already has a charge called starhub.");
    expect(plan({ label: "Starhub", personId: jordan }).canSave).toBe(true);
  });

  it("ignores a charge that has ended when checking the label", () => {
    const config: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      recurring: [{ id: "old", label: "Parking", amountCents: 500, personId: jordan, endMonth: "2026-11" }],
    };
    expect(plan({}, config).canSave).toBe(true);
  });

  it("changes a saved charge in place, listing only what changed", () => {
    const result = planSaved({ amountCents: 3000, endMonth: "2027-03" });
    expect(result.nextConfig?.recurring).toEqual([
      { id: STARHUB, label: "Starhub", amountCents: 3000, personId: priya, endMonth: "2027-03" },
    ]);
    expect(result.groups).toEqual([
      {
        title: "Saves from Dec 2026",
        rows: [
          { label: "Amount", from: "$27.50", to: "$30.00" },
          { label: "End month", from: "None", to: "Mar 2027" },
        ],
      },
    ]);
  });

  it("has nothing to save when nothing changed", () => {
    const result = planSaved({});
    expect(result.canSave).toBe(false);
    expect(result.groups).toEqual([]);
    expect(result.errors).toEqual({});
  });

  it("names both people when the charge moves to someone else", () => {
    expect(planSaved({ personId: jordan }).groups[0].rows).toEqual([{ label: "Who", from: "Priya", to: "Jordan" }]);
  });
});

describe("planRemoveRecurring", () => {
  it("takes the charge out of the config", () => {
    const result = planRemoveRecurring(NOV_2026_CONFIG, STARHUB);
    expect(result.canSave).toBe(true);
    expect(result.nextConfig?.recurring).toEqual([]);
  });
});
