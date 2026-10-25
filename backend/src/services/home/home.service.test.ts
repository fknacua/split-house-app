import { afterEach, describe, expect, it, vi } from "vitest";
import { HOUSEHOLD_SCHEMA_VERSION, homeResponseSchema } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import type { HomeChargeRow } from "@/lib/home/build-home";
import { buildMonthCharges } from "@/lib/split/engine";
import { getHome, type HomeDb } from "./home.service";

const VERSION = { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG };

const CHARGES: HomeChargeRow[] = buildMonthCharges(NOV_2026_CONFIG, "2026-11").map((c, i) => ({
  id: `charge-${i}`,
  personId: c.personId,
  payViaPersonId: c.payViaPersonId,
  category: c.category,
  label: c.label,
  amountCents: c.amountCents,
  dueDate: c.dueDate ? new Date(c.dueDate) : null,
  paidCents: null,
}));

/** A database where November is either already open or not, with no household version to open it from. */
function fakeDb(open: boolean): HomeDb {
  const tx = {
    month: {
      findUnique: async () => (open ? { month: "2026-11", householdVersionId: "v-b" } : null),
      create: async () => {
        throw new Error("not expected");
      },
      findFirst: async () => (open ? { month: "2026-11", householdVersion: VERSION } : null),
    },
    householdVersion: { findFirst: async () => null },
    charge: {
      createMany: async () => undefined,
      findMany: async () => CHARGES,
    },
    person: {
      findMany: async () => [
        { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
        { id: PERSON_IDS.priya, name: "Priya", isOwner: false },
        { id: PERSON_IDS.sam, name: "Sam", isOwner: false },
        { id: PERSON_IDS.jordan, name: "Jordan", isOwner: false },
      ],
    },
    bill: { findUnique: async () => null },
  };
  return { ...tx, $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx) } as unknown as HomeDb;
}

afterEach(() => vi.unstubAllEnvs());

describe("getHome", () => {
  it("returns a response that parses with the shared schema", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-01T09:00:00+08:00");
    const home = await getHome(fakeDb(true));
    expect(homeResponseSchema.safeParse(home).success).toBe(true);
    expect(home.month).toBe("2026-11");
    expect(home.hero.dateLine).toBe("1 Nov · Step 1 of 3");
  });

  it("answers 409 when no month can be open because there is no household yet", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-01T09:00:00+08:00");
    await expect(getHome(fakeDb(false))).rejects.toMatchObject({ status: 409 });
  });
});
