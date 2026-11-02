import { householdConfigSchema, householdViewResponseSchema, type HouseholdConfig } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { buildHouseholdView, type HouseholdViewInput } from "./build-household-view";

const { alex, priya, sam, jordan } = PERSON_IDS;

const PEOPLE = [
  { id: alex, name: "Alex", whatsappE164: null },
  { id: priya, name: "Priya", whatsappE164: "+6581234567" },
  { id: sam, name: "Sam", whatsappE164: null },
  { id: jordan, name: "Jordan", whatsappE164: "+6581234568" },
];

function input(overrides: Partial<HouseholdViewInput> = {}): HouseholdViewInput {
  return {
    month: "2026-11",
    activeMonth: "2026-11",
    versionMonths: ["2026-08", "2026-11"],
    config: NOV_2026_CONFIG,
    people: PEOPLE,
    ...overrides,
  };
}

/** The November config with some of its categories replaced. */
function withCategories(categories: Partial<HouseholdConfig["categories"]>): HouseholdConfig {
  return { ...NOV_2026_CONFIG, categories: { ...NOV_2026_CONFIG.categories, ...categories } };
}

function card(view: ReturnType<typeof buildHouseholdView>, personId: string) {
  const found = view.people.find((p) => p.personId === personId);
  if (!found) throw new Error(`no card for ${personId}`);
  return found;
}

describe("buildHouseholdView", () => {
  it("parses with the shared schema", () => {
    expect(() => householdViewResponseSchema.parse(buildHouseholdView(input()))).not.toThrow();
  });

  it("shows the landlord card's stats, without rent or rooms until 9.9", () => {
    expect(buildHouseholdView(input()).landlord).toEqual({
      stats: [
        { value: "6", label: "aircon units" },
        { value: "5", label: "utility shares" },
      ],
      edit: { label: "Edit", target: { kind: "edit-home" } },
    });
  });

  it("lists the primary tenant, then the tenants, then the owner as You", () => {
    const view = buildHouseholdView(input());
    expect(view.people.map((p) => p.name)).toEqual(["Priya", "Sam", "Jordan", "You"]);
    expect(view.people.map((p) => p.initial)).toEqual(["P", "S", "J", "Y"]);
  });

  it("builds the primary tenant's card from the split", () => {
    const priyaCard = card(buildHouseholdView(input()), priya);
    expect(priyaCard.sub).toBe("Master room · pays you directly");
    expect(priyaCard.facts).toEqual([
      { label: "Rent · due 7th", value: "$1,675.00" },
      { label: "Utilities · due 7th", value: "1.5 shares" },
      { label: "Aircon", value: "2 units" },
      { label: "WhatsApp", value: "+65 8123 4567" },
    ]);
    expect(priyaCard.actions).toEqual([
      { label: "Edit split", target: { kind: "edit-split" } },
      { label: "Edit", target: { kind: "edit-person", personId: priya } },
    ]);
  });

  it("uses the Via person's due day and says where the messages go", () => {
    const samCard = card(buildHouseholdView(input()), sam);
    expect(samCard.sub).toBe("Own room · utilities and aircon via Priya");
    expect(samCard.facts).toEqual([
      { label: "Rent · due 28th", value: "$950.00 direct" },
      { label: "Utilities · due 7th", value: "1 share via Priya" },
      { label: "Aircon", value: "1 unit" },
      { label: "Messages", value: "In Priya’s" },
    ]);
    expect(samCard.actions).toEqual([{ label: "Edit", target: { kind: "edit-person", personId: sam } }]);
  });

  it("shows a held deposit, with no savings copy", () => {
    const view = buildHouseholdView(input());
    expect(card(view, jordan).facts).toEqual([
      { label: "Rent · due 1st", value: "$950.00 direct" },
      { label: "Utilities · due 4th", value: "1 share" },
      { label: "Aircon", value: "1 unit" },
      { label: "Deposit", value: "$950.00 held" },
    ]);
    expect(JSON.stringify(view).toLowerCase()).not.toContain("savings");
  });

  it("shows WhatsApp on a tenant with no via route and no deposit", () => {
    const config = {
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people.map((p) => (p.personId === jordan ? { ...p, depositCents: 0 } : p)),
    };
    expect(card(buildHouseholdView(input({ config })), jordan).facts.at(-1)).toEqual({
      label: "WhatsApp",
      value: "+65 8123 4568",
    });
    const noNumber = PEOPLE.map((p) => (p.id === jordan ? { ...p, whatsappE164: null } : p));
    expect(card(buildHouseholdView(input({ config, people: noNumber })), jordan).facts.at(-1)?.value).toBe("Not set");
  });

  it("builds the owner's card, with only Edit split", () => {
    const you = card(buildHouseholdView(input()), alex);
    expect(you.sub).toBe("Master room · pays landlord & utilities");
    expect(you.facts).toEqual([
      { label: "Rent share", value: "$1,675.00" },
      { label: "Utilities", value: "1.5 shares" },
      { label: "Aircon", value: "2 units" },
      { label: "Leftover cents", value: "Absorbed by you" },
    ]);
    expect(you.actions).toEqual([{ label: "Edit split", target: { kind: "edit-split" } }]);
  });

  it("writes the split rows as on the board", () => {
    expect(buildHouseholdView(input()).split).toEqual({
      title: "Your split with Priya",
      sub: "What’s left after Sam & Jordan",
      edit: { label: "Edit split", target: { kind: "edit-split" } },
      rows: [
        { label: "Rent", detail: "$3,350.00 master room · $1,675.00 each", ownerPercent: 50, ratio: "50 / 50" },
        { label: "Utilities", detail: "3 of 5 shares · 1.5 each", ownerPercent: 50, ratio: "50 / 50" },
        { label: "Aircon", detail: "4 of 6 units · 2 each", ownerPercent: 50, ratio: "50 / 50" },
      ],
    });
  });

  it("names each part when the split is not even, rounding the primary tenant and leaving the owner the rest", () => {
    const config = withCategories({
      rent: { sharedRentCents: 335000, ownerBps: 6000, primaryBps: 4000 },
      utilities: { totalShares: 5000, ownerBps: 6000, primaryBps: 4000, billDueDay: 16 },
      aircon: { totalUnits: 6, ownerBps: 6667, primaryBps: 3333 },
    });
    const view = buildHouseholdView(input({ config }));
    expect(view.split?.rows).toEqual([
      { label: "Rent", detail: "$3,350.00 master room · you $2,010.00, Priya $1,340.00", ownerPercent: 60, ratio: "60 / 40" },
      { label: "Utilities", detail: "3 of 5 shares · you 1.8, Priya 1.2", ownerPercent: 60, ratio: "60 / 40" },
      { label: "Aircon", detail: "4 of 6 units · you 2.667, Priya 1.333", ownerPercent: 66.67, ratio: "66.67 / 33.33" },
    ]);
    expect(card(view, priya).facts[0].value).toBe("$1,340.00");
    expect(card(view, alex).facts[0].value).toBe("$2,010.00");
  });

  it("has no split and no Edit split without a primary tenant", () => {
    const remainder = { ownerBps: 10000, primaryBps: 0 };
    const config = householdConfigSchema.parse({
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people
        .filter((p) => p.personId !== priya)
        .map((p) => (p.personId === sam ? { ...p, routes: {} } : p)),
      categories: {
        rent: { sharedRentCents: 335000, ...remainder },
        utilities: { totalShares: 5000, ...remainder },
        aircon: { totalUnits: 6, ...remainder },
      },
      recurring: [],
    });
    const view = buildHouseholdView(input({ config }));
    expect(view.split).toBeNull();
    expect(view.people.map((p) => p.name)).toEqual(["Sam", "Jordan", "You"]);
    expect(card(view, alex).actions).toEqual([]);
    expect(card(view, alex).facts[0].value).toBe("$3,350.00");
    expect(() => householdViewResponseSchema.parse(view)).not.toThrow();
  });

  it("drops the split's sub line when there are no tenants", () => {
    const config = {
      ...withCategories({}),
      people: NOV_2026_CONFIG.people.filter((p) => p.role !== "TENANT"),
    };
    expect(buildHouseholdView(input({ config })).split?.sub).toBeNull();
  });

  it("leaves out a due day that is not set", () => {
    const config = {
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people.map((p) => (p.personId === jordan ? { ...p, dueDays: {} } : p)),
    };
    const labels = card(buildHouseholdView(input({ config })), jordan).facts.map((f) => f.label);
    expect(labels.slice(0, 2)).toEqual(["Rent", "Utilities"]);
  });

  it("does not list someone who is not in the month's config", () => {
    const config = { ...NOV_2026_CONFIG, people: NOV_2026_CONFIG.people.filter((p) => p.personId !== jordan) };
    const newcomer = [...PEOPLE, { id: "person-new", name: "Casey", whatsappE164: null }];
    const names = buildHouseholdView(input({ config, people: newcomer })).people.map((p) => p.name);
    expect(names).toEqual(["Priya", "Sam", "You"]);
  });

  describe("month list", () => {
    it("lists each version's month and the active month, newest first, marking only later ones upcoming", () => {
      const view = buildHouseholdView(input({ versionMonths: ["2026-08", "2026-11", "2027-01"] }));
      expect(view.monthLabel).toBe("Nov 2026");
      expect(view.monthOptions).toEqual([
        { month: "2027-01", label: "Jan 2027", badge: { label: "Upcoming", tone: "neutral" } },
        { month: "2026-11", label: "Nov 2026", badge: null },
        { month: "2026-08", label: "Aug 2026", badge: null },
      ]);
    });

    it("adds the active month when no version starts on it", () => {
      const view = buildHouseholdView(input({ month: "2026-12", activeMonth: "2026-12" }));
      expect(view.monthOptions.map((o) => o.month)).toEqual(["2026-12", "2026-11", "2026-08"]);
    });
  });
});
