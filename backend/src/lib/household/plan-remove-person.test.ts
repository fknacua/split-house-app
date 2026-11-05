import type { HouseholdConfig } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { planRemovePerson } from "./plan-remove-person";
import { masterRentCents, sharedAirconUnits, totalAirconUnits } from "./room-amounts";

const { alex, priya, sam, jordan } = PERSON_IDS;

describe("planRemovePerson", () => {
  it("takes them out, with the utilities total following and the aircon total staying", () => {
    const { categories } = NOV_2026_CONFIG;
    const plan = planRemovePerson(jordan, NOV_2026_CONFIG);
    expect(plan).toMatchObject({ errors: {}, canSave: true });
    expect(plan.nextConfig?.people.map((p) => p.personId)).not.toContain(jordan);
    expect(plan.nextConfig?.categories.utilities.totalShares).toBe(categories.utilities.totalShares - 1000);
    expect(plan.nextConfig?.categories.rent).toEqual(categories.rent);
    expect(plan.nextConfig?.rooms).toEqual(NOV_2026_CONFIG.rooms);
    expect(totalAirconUnits(plan.nextConfig!)).toBe(totalAirconUnits(NOV_2026_CONFIG));
    expect(sharedAirconUnits(plan.nextConfig!)).toBe(5);
  });

  it("leaves the room empty, so the owner and primary tenant cover a room that was in the total", () => {
    expect(masterRentCents(planRemovePerson(sam, NOV_2026_CONFIG).nextConfig!)).toBe(430000);
    expect(masterRentCents(planRemovePerson(jordan, NOV_2026_CONFIG).nextConfig!)).toBe(335000);
  });

  it("takes their recurring charges with them", () => {
    const config: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      recurring: [
        ...NOV_2026_CONFIG.recurring,
        { id: "recurring-jordan", label: "Parking", amountCents: 1000, personId: jordan },
      ],
    };
    const next = planRemovePerson(jordan, config).nextConfig;
    expect(next?.recurring).toEqual(NOV_2026_CONFIG.recurring);
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
