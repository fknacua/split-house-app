import { describe, expect, it } from "vitest";
import { HOUSEHOLD_SCHEMA_VERSION } from "@splithouse/shared";
import { NOV_2026_CONFIG, VERSION_A_CONFIG } from "@/lib/fixtures/household";
import { buildMonthCharges } from "@/lib/split/engine";
import { openMonthIfNeeded, type MonthOpenDb, type MonthOpenTx, type VersionRow } from "./month-open";

type ChargeRow = Parameters<MonthOpenTx["charge"]["createMany"]>[0]["data"][number];

function fakeDb(versions: VersionRow[]) {
  const months = new Map<string, { month: string; householdVersionId: string }>();
  const charges: ChargeRow[] = [];
  const tx: MonthOpenTx = {
    month: {
      findUnique: async ({ where }) => months.get(where.month) ?? null,
      create: async ({ data }) => {
        if (months.has(data.month)) throw Object.assign(new Error("unique"), { code: "P2002" });
        months.set(data.month, data);
        return data;
      },
    },
    householdVersion: {
      findFirst: async ({ where }) =>
        versions
          .filter((v) => v.startsFromMonth <= where.startsFromMonth.lte)
          .sort((a, b) => b.startsFromMonth.localeCompare(a.startsFromMonth))[0] ?? null,
    },
    charge: {
      createMany: async ({ data }) => {
        charges.push(...data);
      },
    },
  };
  const db: MonthOpenDb = {
    ...tx,
    // Roll back on failure, like a real transaction.
    $transaction: async (fn) => {
      const monthsBefore = new Map(months);
      const chargesBefore = charges.length;
      try {
        return await fn(tx);
      } catch (err) {
        months.clear();
        monthsBefore.forEach((v, k) => months.set(k, v));
        charges.length = chargesBefore;
        throw err;
      }
    },
  };
  return { db, months, charges };
}

const versionA: VersionRow = {
  id: "v-a",
  startsFromMonth: "2026-08",
  schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
  config: VERSION_A_CONFIG,
};
const versionB: VersionRow = {
  id: "v-b",
  startsFromMonth: "2026-11",
  schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
  config: NOV_2026_CONFIG,
};

describe("openMonthIfNeeded", () => {
  it("opens the month on the version starting on or before it, with the engine's charges", async () => {
    const { db, months, charges } = fakeDb([versionA, versionB]);

    const opened = await openMonthIfNeeded(db, "2026-11");

    expect(opened).toEqual({ month: "2026-11", householdVersionId: "v-b" });
    expect(months.size).toBe(1);
    const expected = buildMonthCharges(NOV_2026_CONFIG, "2026-11");
    expect(charges).toHaveLength(expected.length);
    expect(charges.map((c) => c.amountCents).sort()).toEqual(expected.map((c) => c.amountCents).sort());
    expect(charges.every((c) => c.householdVersionId === "v-b" && c.month === "2026-11")).toBe(true);
  });

  it("uses the older version for a month before the newer one starts", async () => {
    const { db } = fakeDb([versionA, versionB]);
    const opened = await openMonthIfNeeded(db, "2026-10");
    expect(opened?.householdVersionId).toBe("v-a");
  });

  it("is idempotent: a second call creates nothing", async () => {
    const { db, months, charges } = fakeDb([versionB]);
    await openMonthIfNeeded(db, "2026-11");
    const chargeCount = charges.length;

    const again = await openMonthIfNeeded(db, "2026-11");

    expect(again).toEqual({ month: "2026-11", householdVersionId: "v-b" });
    expect(months.size).toBe(1);
    expect(charges).toHaveLength(chargeCount);
  });

  it("returns the winner's row when a concurrent request creates the month first", async () => {
    const { db } = fakeDb([versionB]);
    const winner = { month: "2026-11", householdVersionId: "v-b" };
    // Simulate losing the race: inside the transaction the lookup misses and
    // create hits the unique key; outside it the winner's row is visible.
    db.$transaction = (fn) =>
      fn({
        month: {
          findUnique: async () => null,
          create: async () => {
            throw Object.assign(new Error("unique"), { code: "P2002" });
          },
        },
        householdVersion: { findFirst: async () => versionB },
        charge: { createMany: async () => undefined },
      });
    db.month.findUnique = async () => winner;

    expect(await openMonthIfNeeded(db, "2026-11")).toEqual(winner);
  });

  it("returns null and creates nothing when no household version exists yet", async () => {
    const { db, months, charges } = fakeDb([]);
    expect(await openMonthIfNeeded(db, "2026-11")).toBeNull();
    expect(months.size).toBe(0);
    expect(charges).toHaveLength(0);
  });

  it("returns null for a month before the first version starts", async () => {
    const { db } = fakeDb([versionB]);
    expect(await openMonthIfNeeded(db, "2026-10")).toBeNull();
  });

  it("rolls back the month when the charges cannot be built", async () => {
    const bad: VersionRow = { ...versionB, schemaVersion: 999 };
    const { db, months } = fakeDb([bad]);
    await expect(openMonthIfNeeded(db, "2026-11")).rejects.toThrow(/schemaVersion/);
    expect(months.size).toBe(0);
  });
});
