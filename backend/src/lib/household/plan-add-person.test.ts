import { describe, expect, it } from "vitest";
import type { HouseholdAddPersonEdit, HouseholdConfig } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS, ROOM_IDS } from "@/lib/fixtures/household";
import { planAddPerson } from "./plan-add-person";
import { masterRentCents, sharedAirconUnits, totalAirconUnits } from "./room-amounts";

const ID = "person-casey";
const ROOM_ID = "room-4";
const withRoom = (includeInTotal: boolean, rentCents = 90000): HouseholdConfig => ({
  ...NOV_2026_CONFIG,
  rooms: [...NOV_2026_CONFIG.rooms, { id: ROOM_ID, roomType: "TENANT", name: "Room 4", airconUnits: 1, rentCents, includeInTotal }],
});
const CONFIG = withRoom(true);
const filled: HouseholdAddPersonEdit = {
  kind: "addPerson",
  name: "  Casey ",
  whatsappE164: "+6590000004",
  color: "PURPLE",
  roomId: ROOM_ID,
  utilityShares: 1000,
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
  roomId: null,
  utilityShares: null,
  depositCents: 0,
  rentDueDay: null,
  utilitiesDueDay: null,
};
const plan = (fields: Partial<HouseholdAddPersonEdit> = {}) => planAddPerson({ ...filled, ...fields }, ID, CONFIG);

describe("planAddPerson", () => {
  it("puts the tenant in the room, with the utilities total following", () => {
    const { categories } = CONFIG;
    const result = plan();
    expect(result).toMatchObject({ name: "Casey", errors: {}, canSave: true });
    expect(result.nextConfig?.categories.utilities.totalShares).toBe(categories.utilities.totalShares + 1000);
    expect(result.nextConfig?.categories.rent).toEqual(categories.rent);
    expect(result.nextConfig?.people.at(-1)).toEqual({
      personId: ID,
      role: "TENANT",
      roomId: ROOM_ID,
      utilityShares: 1000,
      routes: {},
      dueDays: { RENT: 3, UTILITIES: 5, AIRCON: 5 },
      depositCents: 90000,
    });
  });

  it("leaves everyone else's entries and the rooms as they are", () => {
    const { nextConfig } = plan();
    expect(nextConfig?.people.slice(0, -1)).toEqual(CONFIG.people);
    expect(nextConfig?.rooms).toEqual(CONFIG.rooms);
  });

  it("takes the room's rent off the master rent and its units off the shared ones, with the aircon total staying", () => {
    const next = plan().nextConfig as HouseholdConfig;
    expect(masterRentCents(next)).toBe(masterRentCents(CONFIG) - 90000);
    expect(sharedAirconUnits(next)).toBe(sharedAirconUnits(CONFIG) - 1);
    expect(totalAirconUnits(next)).toBe(totalAirconUnits(CONFIG));
  });

  it("leaves the master rent alone for a room not in the total, and still moves its units", () => {
    const config = withRoom(false);
    const next = planAddPerson(filled, ID, config).nextConfig as HouseholdConfig;
    expect(masterRentCents(next)).toBe(masterRentCents(config));
    expect(sharedAirconUnits(next)).toBe(sharedAirconUnits(config) - 1);
  });

  it("shows no errors on an empty form, and no Save", () => {
    expect(planAddPerson(empty, ID, CONFIG)).toEqual({ name: null, nextConfig: null, errors: {}, canSave: false });
  });

  it.each([
    ["name", { name: "   " }],
    ["room", { roomId: null }],
    ["shares", { utilityShares: null }],
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

  it("allows 0 shares and no WhatsApp number", () => {
    expect(plan({ utilityShares: 0, whatsappE164: null }).canSave).toBe(true);
  });

  it.each([
    ["whatsappE164", { whatsappE164: "12" }, "Enter a valid phone number."],
    ["color", { color: "TEAL" }, "Teal is only for you."],
    ["depositCents", { depositCents: -1 }, "Enter 0 or more."],
    ["utilityShares", { utilityShares: -1 }, "Enter 0 or more."],
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

  it.each([
    ["taken", ROOM_IDS.room3],
    ["the master room", ROOM_IDS.master],
    ["a common room", ROOM_IDS.living],
    ["unknown", "room-nowhere"],
  ])("refuses a room that is %s", (_, roomId) => {
    const result = plan({ roomId });
    expect(result.errors.roomId).toBe("Choose an empty room.");
    expect(result).toMatchObject({ nextConfig: null, canSave: false });
  });

  it("refuses a room whose rent would take the master rent below zero", () => {
    const config = withRoom(true, masterRentCents(NOV_2026_CONFIG) + 1);
    expect(planAddPerson(filled, ID, config)).toMatchObject({
      nextConfig: null,
      errors: { form: "Master room rent cannot be below zero" },
      canSave: false,
    });
  });
});
