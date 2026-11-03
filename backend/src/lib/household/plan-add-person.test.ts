import { describe, expect, it } from "vitest";
import type { HouseholdAddPersonEdit } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { planAddPerson } from "./plan-add-person";

const ID = "person-casey";
const filled: HouseholdAddPersonEdit = {
  kind: "addPerson",
  name: "  Casey ",
  whatsappE164: "+6590000004",
  color: "PURPLE",
  rentCents: 90000,
  utilityShares: 1000,
  airconUnits: 1,
  depositCents: 90000,
  rentDueDay: 3,
  utilitiesDueDay: 5,
  rentViaPersonId: null,
  utilitiesViaPersonId: null,
};
const empty: HouseholdAddPersonEdit = {
  ...filled,
  name: "",
  whatsappE164: null,
  rentCents: null,
  utilityShares: null,
  airconUnits: null,
  depositCents: 0,
  rentDueDay: null,
  utilitiesDueDay: null,
};
const plan = (fields: Partial<HouseholdAddPersonEdit> = {}) => planAddPerson({ ...filled, ...fields }, ID, NOV_2026_CONFIG);

describe("planAddPerson", () => {
  it("adds the tenant, with the utilities total following and the aircon total staying", () => {
    const { categories } = NOV_2026_CONFIG;
    const result = plan();
    expect(result).toMatchObject({ name: "Casey", errors: {}, canSave: true });
    expect(result.nextConfig?.categories.utilities.totalShares).toBe(categories.utilities.totalShares + 1000);
    expect(result.nextConfig?.categories.aircon.totalUnits).toBe(categories.aircon.totalUnits);
    expect(result.nextConfig?.categories.rent).toEqual(categories.rent);
    expect(result.nextConfig?.people.at(-1)).toEqual({
      personId: ID,
      role: "TENANT",
      rentCents: 90000,
      utilityShares: 1000,
      airconUnits: 1,
      routes: {},
      dueDays: { RENT: 3, UTILITIES: 5, AIRCON: 5 },
      depositCents: 90000,
    });
  });

  it("leaves everyone else's entries as they are", () => {
    expect(plan().nextConfig?.people.slice(0, -1)).toEqual(NOV_2026_CONFIG.people);
  });

  it("shows no errors on an empty form, and no Save", () => {
    expect(planAddPerson(empty, ID, NOV_2026_CONFIG)).toEqual({ name: null, nextConfig: null, errors: {}, canSave: false });
  });

  it.each([
    ["name", { name: "   " }],
    ["rent", { rentCents: null }],
    ["shares", { utilityShares: null }],
    ["units", { airconUnits: null }],
    ["rent day", { rentDueDay: null }],
    ["utilities day", { utilitiesDueDay: null }],
  ])("keeps Save disabled without the %s", (_, fields) => {
    expect(plan(fields)).toMatchObject({ nextConfig: null, errors: {}, canSave: false });
  });

  it("needs no due day for a charge sent via someone, and sets aircon's route with utilities", () => {
    const result = plan({ utilitiesViaPersonId: PERSON_IDS.priya, utilitiesDueDay: null });
    expect(result.canSave).toBe(true);
    const tenant = result.nextConfig?.people.at(-1);
    expect(tenant?.dueDays).toEqual({ RENT: 3 });
    expect(tenant?.routes).toEqual({
      UTILITIES: { kind: "VIA", viaPersonId: PERSON_IDS.priya },
      AIRCON: { kind: "VIA", viaPersonId: PERSON_IDS.priya },
    });
  });

  it("allows 0 shares and units and no WhatsApp number", () => {
    expect(plan({ utilityShares: 0, airconUnits: 0, whatsappE164: null }).canSave).toBe(true);
  });

  it.each([
    ["whatsappE164", { whatsappE164: "12" }, "Enter a valid phone number."],
    ["color", { color: "TEAL" }, "Teal is only for you."],
    ["rentCents", { rentCents: -1 }, "Enter 0 or more."],
    ["depositCents", { depositCents: -1 }, "Enter 0 or more."],
    ["utilityShares", { utilityShares: -1 }, "Enter 0 or more."],
    ["airconUnits", { airconUnits: -1 }, "Enter 0 or more."],
    ["rentDueDay", { rentDueDay: 32 }, "Enter a day from 1 to 31."],
    ["utilitiesDueDay", { utilitiesDueDay: 0 }, "Enter a day from 1 to 31."],
    ["rentViaPersonId", { rentViaPersonId: PERSON_IDS.alex }, "Choose someone else in the household."],
    ["rentViaPersonId", { rentViaPersonId: "person-nobody" }, "Choose someone else in the household."],
    [
      "utilitiesViaPersonId",
      { utilitiesViaPersonId: PERSON_IDS.sam },
      "This person pays via someone, so choose someone who pays directly.",
    ],
  ] as const)("refuses a bad %s", (field, fields, message) => {
    const result = plan(fields as Partial<HouseholdAddPersonEdit>);
    expect(result.errors[field]).toBe(message);
    expect(result).toMatchObject({ nextConfig: null, canSave: false });
  });

  it("refuses more aircon units than the house has left", () => {
    expect(plan({ airconUnits: 5 }).errors.airconUnits).toBe("The house has only 4 left.");
    expect(plan({ airconUnits: 4 }).canSave).toBe(true);
    const { aircon } = NOV_2026_CONFIG.categories;
    const full = { ...NOV_2026_CONFIG, categories: { ...NOV_2026_CONFIG.categories, aircon: { ...aircon, totalUnits: 2 } } };
    expect(planAddPerson({ ...filled, airconUnits: 1 }, ID, full).errors.airconUnits).toBe("The house has no aircon units left.");
  });
});
