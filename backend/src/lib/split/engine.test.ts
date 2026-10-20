import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
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
    // 11000 / 6 = 1833.33 per unit.
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

describe("Nov 2026 fixture totals", () => {
  const monthCharges = buildMonthCharges(NOV_2026_CONFIG, MONTH);
  const utilitiesCharges = buildUtilitiesCharges(NOV_2026_CONFIG, { month: MONTH, currentChargesCents: 41230 });
  const airconAmounts = splitShareCategory(
    11000,
    6,
    [
      { personId: PERSON_IDS.sam, units: 1 },
      { personId: PERSON_IDS.jordan, units: 1 },
    ],
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
