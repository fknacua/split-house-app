import { HOUSEHOLD_SCHEMA_VERSION, type HouseholdConfig } from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { NOV_2026_CONFIG, PERSON_IDS, VERSION_A_CONFIG } from "@/lib/fixtures/household";
import { getHouseholdView, type HouseholdViewDb } from "./household-view.service";

const PEOPLE = [
  { id: PERSON_IDS.alex, name: "Alex", whatsappE164: null },
  { id: PERSON_IDS.priya, name: "Priya", whatsappE164: "+6581234567" },
  { id: PERSON_IDS.sam, name: "Sam", whatsappE164: null },
  { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: "+6581234568" },
];

const version = (startsFromMonth: string, config: HouseholdConfig) => ({
  startsFromMonth,
  schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
  config,
});

/** January's rent rises to $1,000.00 for Jordan, so a card shows which version was read. */
const JAN_2027_CONFIG: HouseholdConfig = {
  ...NOV_2026_CONFIG,
  people: NOV_2026_CONFIG.people.map((p) => (p.personId === PERSON_IDS.jordan ? { ...p, rentCents: 100000 } : p)),
};

const VERSIONS = [
  version("2027-01", JAN_2027_CONFIG),
  version("2026-11", NOV_2026_CONFIG),
  version("2026-08", VERSION_A_CONFIG),
];

function fakeDb(
  versions = VERSIONS,
  pinned: Record<string, HouseholdConfig> = {},
  newestMonth: string | null = "2026-11",
): HouseholdViewDb {
  return {
    month: {
      findFirst: async () => (newestMonth ? { month: newestMonth } : null),
      findUnique: async ({ where }) =>
        pinned[where.month]
          ? { householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: pinned[where.month] } }
          : null,
    },
    householdVersion: { findMany: async () => versions },
    person: { findMany: async () => PEOPLE },
  };
}

/** Jordan's rent fact on the response, which differs between the versions. */
async function jordanRent(db: HouseholdViewDb, month?: string): Promise<string | undefined> {
  const view = await getHouseholdView(db, month);
  return view.people.find((p) => p.personId === PERSON_IDS.jordan)?.facts[0].value;
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("getHouseholdView", () => {
  it("defaults to the active month", async () => {
    const view = await getHouseholdView(fakeDb());
    expect(view.month).toBe("2026-11");
    expect(view.monthLabel).toBe("Nov 2026");
  });

  it("follows the newest opened month when it is ahead of the calendar", async () => {
    const view = await getHouseholdView(fakeDb(VERSIONS, {}, "2026-12"));
    expect(view.month).toBe("2026-12");
    expect(view.monthOptions[0].badge?.label).toBe("Upcoming");
    expect(view.monthOptions.find((o) => o.month === "2026-12")?.badge).toBeNull();
  });

  it("reads the newest version starting on or before an unopened month", async () => {
    expect(await jordanRent(fakeDb(), "2027-01")).toBe("$1,000.00 direct");
    expect(await jordanRent(fakeDb(), "2027-03")).toBe("$1,000.00 direct");
    expect(await jordanRent(fakeDb(), "2026-12")).toBe("$950.00 direct");
  });

  it("reads the version an opened month is pinned to", async () => {
    const db = fakeDb(VERSIONS, { "2026-09": JAN_2027_CONFIG });
    expect(await jordanRent(db, "2026-09")).toBe("$1,000.00 direct");
    expect(await jordanRent(db, "2026-10")).toBe("$920.00 direct");
  });

  it("marks only months after the active one as upcoming", async () => {
    const view = await getHouseholdView(fakeDb(), "2027-01");
    expect(view.monthOptions.map((o) => [o.month, o.badge?.label ?? null])).toEqual([
      ["2027-01", "Upcoming"],
      ["2026-11", null],
      ["2026-08", null],
    ]);
  });

  it("answers 409 no_household before first run", async () => {
    await expect(getHouseholdView(fakeDb([], {}, null))).rejects.toMatchObject({
      status: 409,
      code: "no_household",
    });
  });

  it("answers 404 no_version for a month before every version", async () => {
    const error = await getHouseholdView(fakeDb(), "2026-07").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: "no_version" });
  });

  it("does not open the month", async () => {
    const db = fakeDb();
    const create = vi.fn();
    Object.assign(db.month, { create, upsert: create });
    await getHouseholdView(db);
    expect(create).not.toHaveBeenCalled();
  });
});
