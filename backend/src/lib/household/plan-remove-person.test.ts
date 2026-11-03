import type { HouseholdConfig } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { planRemovePerson } from "./plan-remove-person";

const { alex, priya, sam, jordan } = PERSON_IDS;

describe("planRemovePerson", () => {
  it("takes them out, with the utilities total following and the aircon total staying", () => {
    const { categories } = NOV_2026_CONFIG;
    const plan = planRemovePerson(jordan, NOV_2026_CONFIG);
    expect(plan).toMatchObject({ errors: {}, canSave: true });
    expect(plan.nextConfig?.people.map((p) => p.personId)).not.toContain(jordan);
    expect(plan.nextConfig?.categories.utilities.totalShares).toBe(categories.utilities.totalShares - 1000);
    expect(plan.nextConfig?.categories.aircon.totalUnits).toBe(categories.aircon.totalUnits);
    expect(plan.nextConfig?.categories.rent).toEqual(categories.rent);
  });

  it("takes their recurring charges, template overrides and section title with them", () => {
    const config: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      recurring: [
        ...NOV_2026_CONFIG.recurring,
        { id: "recurring-jordan", label: "Parking", amountCents: 1000, personId: jordan },
      ],
      templates: {
        ...NOV_2026_CONFIG.templates,
        overrides: [
          { personId: jordan, kind: "MONTHLY", text: "Hi" },
          { personId: priya, kind: "NUDGE", text: "Hey" },
        ],
        sectionTitles: { [jordan]: "Jordan's", [priya]: "Priya's" },
      },
    };
    const next = planRemovePerson(jordan, config).nextConfig;
    expect(next?.recurring).toEqual(NOV_2026_CONFIG.recurring);
    expect(next?.templates.overrides).toEqual([{ personId: priya, kind: "NUDGE", text: "Hey" }]);
    expect(next?.templates.sectionTitles).toEqual({ [priya]: "Priya's" });
  });

  it("refuses while someone pays via them", () => {
    const config: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people.map((p) =>
        p.personId === sam ? { ...p, routes: { RENT: { kind: "VIA", viaPersonId: jordan } } } : p,
      ),
    };
    expect(planRemovePerson(jordan, config)).toEqual({
      nextConfig: null,
      errors: { form: "This person has payment routed to them. Please redirect the payment before removing." },
      canSave: false,
    });
  });

  it.each([
    ["the owner", alex],
    ["the primary tenant", priya],
  ])("refuses %s", (_name, personId) => {
    expect(planRemovePerson(personId, NOV_2026_CONFIG).errors.form).toBe("Only tenants can be removed.");
  });
});
