import type { HouseholdConfig } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { JAN_2027_CONFIG, NOV_2026_CONFIG, PERSON_IDS, ROOM_IDS } from "@/lib/fixtures/household";
import { roomOf, totalAirconUnits } from "@/lib/household/room-amounts";
import {
  SplitEngineError,
  buildMonthCharges,
  buildUtilitiesCharges,
  splitByShares,
  splitByUnits,
  splitCustom,
  splitShareCategory,
} from "./engine";

const MONTH = "2026-11";

describe("splitByShares / splitByUnits", () => {
  it("rounds each part's share to the nearest cent", () => {
    const result = splitByShares(41230, 5000, [
      { personId: PERSON_IDS.sam, units: 1000 },
      { personId: PERSON_IDS.jordan, units: 1000 },
    ]);
    expect(result).toEqual({ [PERSON_IDS.sam]: 8246, [PERSON_IDS.jordan]: 8246 });
  });

  it("rounds a non-exact unit split half up", () => {
    // Not a whole number of cents per unit.
    const result = splitByUnits(11000, 6, [
      { personId: PERSON_IDS.sam, units: 1 },
      { personId: PERSON_IDS.jordan, units: 1 },
    ]);
    expect(result).toEqual({ [PERSON_IDS.sam]: 1833, [PERSON_IDS.jordan]: 1833 });
  });

  it("throws when shares/units exceed the total", () => {
    expect(() =>
      splitByShares(1000, 100, [{ personId: PERSON_IDS.sam, units: 200 }]),
    ).toThrow(SplitEngineError);
  });
});

describe("splitCustom", () => {
  it("passes through amounts that add up to the total", () => {
    const result = splitCustom(1000, [
      { personId: PERSON_IDS.sam, amountCents: 400 },
      { personId: PERSON_IDS.jordan, amountCents: 600 },
    ]);
    expect(result).toEqual({ [PERSON_IDS.sam]: 400, [PERSON_IDS.jordan]: 600 });
  });

  it("throws when custom amounts do not add up to the total", () => {
    expect(() =>
      splitCustom(1000, [{ personId: PERSON_IDS.sam, amountCents: 400 }]),
    ).toThrow(SplitEngineError);
  });
});

describe("splitShareCategory (aircon fixture)", () => {
  it("splits tenant units then the owner/primary remainder", () => {
    const result = splitShareCategory(
      11000,
      6,
      [
        { personId: PERSON_IDS.sam, units: 1 },
        { personId: PERSON_IDS.jordan, units: 1 },
      ],
      { ownerPersonId: PERSON_IDS.alex, primaryPersonId: PERSON_IDS.priya, primaryBps: 5000 },
    );
    expect(result).toEqual({
      [PERSON_IDS.sam]: 1833,
      [PERSON_IDS.jordan]: 1833,
      [PERSON_IDS.priya]: 3667,
      [PERSON_IDS.alex]: 3667,
    });
    expect(Object.values(result).reduce((s, v) => s + v, 0)).toBe(11000);
  });
});

describe("buildMonthCharges (Nov 2026 fixture)", () => {
  const charges = buildMonthCharges(NOV_2026_CONFIG, MONTH);

  it("splits the shared room rent 50/50 between owner and primary", () => {
    const priyaRent = charges.find((c) => c.personId === PERSON_IDS.priya && c.category === "RENT");
    const alexRent = charges.find((c) => c.personId === PERSON_IDS.alex && c.category === "RENT");
    expect(priyaRent?.amountCents).toBe(167500);
    expect(alexRent?.amountCents).toBe(167500);
    expect(priyaRent?.dueDate).toBe("2026-11-07");
  });

  it("keeps tenant rent fixed, with Sam's routed via Priya for utilities only", () => {
    const samRent = charges.find((c) => c.personId === PERSON_IDS.sam && c.category === "RENT");
    const jordanRent = charges.find((c) => c.personId === PERSON_IDS.jordan && c.category === "RENT");
    expect(samRent).toMatchObject({ amountCents: 95000, payViaPersonId: null, dueDate: "2026-11-28" });
    expect(jordanRent).toMatchObject({ amountCents: 95000, payViaPersonId: null, dueDate: "2026-11-01" });
  });

  it("adds the Starhub recurring charge for Priya", () => {
    const recurring = charges.find((c) => c.category === "RECURRING");
    expect(recurring).toMatchObject({ personId: PERSON_IDS.priya, label: "Starhub", amountCents: 2750 });
  });

  it("matches the landlord rent check: Sam's rent plus the shared room totals 430000", () => {
    const samRent = charges.find((c) => c.personId === PERSON_IDS.sam && c.category === "RENT")!;
    const sharedRentTotal = charges
      .filter((c) => c.category === "RENT" && (c.personId === PERSON_IDS.alex || c.personId === PERSON_IDS.priya))
      .reduce((s, c) => s + c.amountCents, 0);
    expect(samRent.amountCents + sharedRentTotal).toBe(430000);
  });
});

describe("buildMonthCharges (rooms)", () => {
  function rentByPerson(config: HouseholdConfig) {
    return Object.fromEntries(
      buildMonthCharges(config, MONTH)
        .filter((c) => c.category === "RENT")
        .map((c) => [c.personId, c.amountCents]),
    );
  }

  it("charges nobody for an empty room, and the owner and primary tenant cover it", () => {
    const config = {
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people.filter((p) => p.personId !== PERSON_IDS.sam),
    };
    expect(rentByPerson(config)).toEqual({
      [PERSON_IDS.jordan]: 95000,
      [PERSON_IDS.alex]: 215000,
      [PERSON_IDS.priya]: 215000,
    });
  });

  it("still charges the tenant of a room not in the total, without moving the master rent", () => {
    expect(rentByPerson(JAN_2027_CONFIG)).toEqual({
      [PERSON_IDS.sam]: 95000,
      [PERSON_IDS.jordan]: 100000,
      [PERSON_IDS.alex]: 167500,
      [PERSON_IDS.priya]: 167500,
    });
  });

  it("takes a room's rent off the master rent once it is in the total", () => {
    const config = {
      ...NOV_2026_CONFIG,
      rooms: NOV_2026_CONFIG.rooms.map((room) =>
        room.id === ROOM_IDS.room3 ? { ...room, includeInTotal: true } : room,
      ),
    };
    expect(rentByPerson(config)).toEqual({
      [PERSON_IDS.sam]: 95000,
      [PERSON_IDS.jordan]: 95000,
      [PERSON_IDS.alex]: 120000,
      [PERSON_IDS.priya]: 120000,
    });
  });

  it("adds no rent for common rooms", () => {
    const config: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      rooms: [...NOV_2026_CONFIG.rooms, { id: "room-study", roomType: "COMMON", name: "Study", airconUnits: 1 }],
    };
    expect(rentByPerson(config)).toEqual(rentByPerson(NOV_2026_CONFIG));
  });

  it("charges nothing for a tenant room with no rent", () => {
    const config = {
      ...NOV_2026_CONFIG,
      rooms: NOV_2026_CONFIG.rooms.map((room) => (room.id === ROOM_IDS.room3 ? { ...room, rentCents: 0 } : room)),
    };
    expect(rentByPerson(config)).not.toHaveProperty(PERSON_IDS.jordan);
  });
});

describe("buildUtilitiesCharges (Nov 2026 fixture)", () => {
  const charges = buildUtilitiesCharges(NOV_2026_CONFIG, { month: MONTH, currentChargesCents: 41230 });

  it("matches the utilities check: 12369 + 8246 + 8246 + 12369 = 41230", () => {
    const byPerson = Object.fromEntries(charges.map((c) => [c.personId, c.amountCents]));
    expect(byPerson).toEqual({
      [PERSON_IDS.priya]: 12369,
      [PERSON_IDS.sam]: 8246,
      [PERSON_IDS.jordan]: 8246,
      [PERSON_IDS.alex]: 12369,
    });
    expect(charges.reduce((s, c) => s + c.amountCents, 0)).toBe(41230);
  });

  it("routes Sam's utilities via Priya, due on his dueDays.UTILITIES", () => {
    const sam = charges.find((c) => c.personId === PERSON_IDS.sam)!;
    expect(sam.payViaPersonId).toBe(PERSON_IDS.priya);
    expect(sam.dueDate).toBeNull();
  });

  it("throws when tenant shares exceed the category's total shares (hard check)", () => {
    const overShared = structuredClone(NOV_2026_CONFIG);
    overShared.categories.utilities.totalShares = 1500;
    expect(() =>
      buildUtilitiesCharges(overShared, { month: MONTH, currentChargesCents: 41230 }),
    ).toThrow(SplitEngineError);
  });
});

describe("someone at 0% of a split", () => {
  const atPrimaryBps = (primaryBps: number): HouseholdConfig => {
    const split = { primaryBps, ownerBps: 10000 - primaryBps };
    const { rent, utilities } = NOV_2026_CONFIG.categories;
    return {
      ...NOV_2026_CONFIG,
      categories: { ...NOV_2026_CONFIG.categories, rent: { ...rent, ...split }, utilities: { ...utilities, ...split } },
    };
  };
  const BILL = { month: "2026-12", currentChargesCents: 41230 };
  const amountOf = (charges: { personId: string; amountCents: number }[], personId: string) =>
    charges.find((c) => c.personId === personId)?.amountCents;
  const sum = (charges: { amountCents: number }[]) => charges.reduce((s, c) => s + c.amountCents, 0);

  it("gives the primary tenant no charge at 0%, and the owner all of it", () => {
    const config = atPrimaryBps(0);
    const rent = buildMonthCharges(config, "2026-12").filter((c) => c.category === "RENT");
    const utilities = buildUtilitiesCharges(config, BILL);
    expect(amountOf(rent, PERSON_IDS.priya)).toBeUndefined();
    expect(amountOf(rent, PERSON_IDS.alex)).toBe(335000);
    expect(amountOf(utilities, PERSON_IDS.priya)).toBeUndefined();
    expect(amountOf(utilities, PERSON_IDS.alex)).toBe(24738);
  });

  it("gives the owner no charge at 0%, and the primary tenant all of it", () => {
    const config = atPrimaryBps(10000);
    expect(amountOf(buildMonthCharges(config, "2026-12"), PERSON_IDS.alex)).toBeUndefined();
    const utilities = buildUtilitiesCharges(config, BILL);
    expect(amountOf(utilities, PERSON_IDS.alex)).toBeUndefined();
    expect(amountOf(utilities, PERSON_IDS.priya)).toBe(24738);
  });

  it.each([0, 10000])("leaves the tenants' amounts and the totals as they are at %i basis points", (bps) => {
    const utilities = buildUtilitiesCharges(atPrimaryBps(bps), BILL);
    expect(sum(utilities)).toBe(41230);
    expect(amountOf(utilities, PERSON_IDS.sam)).toBe(8246);
    expect(amountOf(utilities, PERSON_IDS.jordan)).toBe(8246);
    const rent = buildMonthCharges(atPrimaryBps(bps), "2026-12").filter((c) => c.category === "RENT");
    expect(sum(rent)).toBe(525000);
  });

  it("creates no charge at $0 for anyone", () => {
    const config = atPrimaryBps(0);
    const charges = [...buildMonthCharges(config, "2026-12"), ...buildUtilitiesCharges(config, BILL)];
    expect(charges.every((c) => c.amountCents !== 0)).toBe(true);
  });

  it("keeps a tenant's route via the primary tenant when she is at 0%", () => {
    const sam = buildUtilitiesCharges(atPrimaryBps(0), BILL).find((c) => c.personId === PERSON_IDS.sam);
    expect(sam?.payViaPersonId).toBe(PERSON_IDS.priya);
  });
});

describe("Nov 2026 fixture totals", () => {
  const monthCharges = buildMonthCharges(NOV_2026_CONFIG, MONTH);
  const utilitiesCharges = buildUtilitiesCharges(NOV_2026_CONFIG, { month: MONTH, currentChargesCents: 41230 });
  const airconAmounts = splitShareCategory(
    11000,
    totalAirconUnits(NOV_2026_CONFIG),
    [PERSON_IDS.sam, PERSON_IDS.jordan].map((personId) => ({
      personId,
      units: roomOf(NOV_2026_CONFIG, personId).airconUnits,
    })),
    { ownerPersonId: PERSON_IDS.alex, primaryPersonId: PERSON_IDS.priya, primaryBps: 5000 },
  );

  function totalFor(personId: string): number {
    const month = monthCharges.filter((c) => c.personId === personId).reduce((s, c) => s + c.amountCents, 0);
    const utilities = utilitiesCharges.filter((c) => c.personId === personId).reduce((s, c) => s + c.amountCents, 0);
    return month + utilities + (airconAmounts[personId] ?? 0);
  }

  it("Primary tenant's total is 186286 (rent + utilities + aircon + Starhub)", () => {
    expect(totalFor(PERSON_IDS.priya)).toBe(186286);
  });

  it("Tenant 1's routed total (utilities + aircon only) is 10079", () => {
    const utilities = utilitiesCharges.find((c) => c.personId === PERSON_IDS.sam)!.amountCents;
    expect(utilities + airconAmounts[PERSON_IDS.sam]).toBe(10079);
  });

  it("Francis's own-share total is 183536 (rent + utilities + aircon)", () => {
    expect(totalFor(PERSON_IDS.alex)).toBe(183536);
  });

  it("Primary tenant's message total without aircon is 190865 (own rent/utilities/Starhub plus Sam's routed utilities)", () => {
    const own = monthCharges.filter((c) => c.personId === PERSON_IDS.priya).reduce((s, c) => s + c.amountCents, 0);
    const ownUtilities = utilitiesCharges.find((c) => c.personId === PERSON_IDS.priya)!.amountCents;
    const samRoutedUtilities = utilitiesCharges.find((c) => c.personId === PERSON_IDS.sam)!.amountCents;
    expect(own + ownUtilities + samRoutedUtilities).toBe(190865);
  });
});

describe("recurring charges", () => {
  const forPerson = (personId: string): HouseholdConfig => ({
    ...NOV_2026_CONFIG,
    recurring: [{ id: "c", label: "Parking", amountCents: 1000, personId }],
  });
  const recurringOf = (config: HouseholdConfig) => buildMonthCharges(config, MONTH).find((c) => c.category === "RECURRING");

  it("follows the person's utilities due day", () => {
    expect(recurringOf(forPerson(PERSON_IDS.jordan))).toMatchObject({ payViaPersonId: null, dueDate: "2026-11-04" });
  });

  it("follows the person's utilities route, not a RECURRING entry", () => {
    expect(recurringOf(forPerson(PERSON_IDS.sam))?.payViaPersonId).toBe(PERSON_IDS.priya);
  });

  it("stops after its end month", () => {
    const config: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      recurring: [{ id: "c", label: "Parking", amountCents: 1000, personId: PERSON_IDS.jordan, endMonth: "2026-10" }],
    };
    expect(recurringOf(config)).toBeUndefined();
  });
});
