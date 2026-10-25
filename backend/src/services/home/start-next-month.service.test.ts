import { afterEach, describe, expect, it, vi } from "vitest";
import { HOUSEHOLD_SCHEMA_VERSION, homeResponseSchema, startNextMonthResponseSchema } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import type { HomeChargeRow } from "@/lib/home/build-home";
import { buildMonthCharges, buildUtilitiesCharges, type EngineCharge } from "@/lib/split/engine";
import { getHome, type HomeDb } from "./home.service";
import { startNextMonth } from "./start-next-month.service";

const VERSION = { id: "v-b", startsFromMonth: "2026-11", schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG };

function toRows(charges: EngineCharge[], paid: boolean): HomeChargeRow[] {
  return charges.map((c, i) => ({
    id: `charge-${i}`,
    personId: c.personId,
    payViaPersonId: c.payViaPersonId,
    category: c.category,
    label: c.label,
    amountCents: c.amountCents,
    dueDate: c.dueDate ? new Date(c.dueDate) : null,
    paidCents: paid ? c.amountCents : null,
    paidOn: paid ? new Date("2026-11-27") : null,
  }));
}

/**
 * A database that remembers which months are open. November is open with its bill; `settled`
 * decides whether everything in it is paid. Opening a month adds it, so the next read sees it.
 */
function fakeDb(settled: boolean, opened: string[] = ["2026-11"]) {
  const months = new Map(opened.map((m) => [m, { month: m, householdVersionId: VERSION.id }]));
  const november = toRows(
    [
      ...buildMonthCharges(NOV_2026_CONFIG, "2026-11"),
      ...buildUtilitiesCharges(NOV_2026_CONFIG, { month: "2026-11", currentChargesCents: 41230 }),
    ],
    settled,
  );
  const monthly = [PERSON_IDS.priya, PERSON_IDS.jordan].map((personId) => ({
    personId,
    kind: "MONTHLY",
    chargeId: null,
    openedAt: new Date("2026-11-02T10:00:00+08:00"),
  }));
  // Charges created by opening a month, by month.
  const created = new Map<string, HomeChargeRow[]>();
  const tx = {
    month: {
      findUnique: async ({ where }: { where: { month: string } }) => months.get(where.month) ?? null,
      create: async ({ data }: { data: { month: string; householdVersionId: string } }) => {
        months.set(data.month, data);
        return data;
      },
      findFirst: async () => {
        const newest = [...months.keys()].sort().at(-1);
        return newest ? { month: newest, householdVersion: VERSION } : null;
      },
    },
    householdVersion: { findFirst: async () => VERSION },
    charge: {
      createMany: async ({ data }: { data: (Omit<HomeChargeRow, "id" | "paidCents" | "paidOn"> & { month: string })[] }) => {
        for (const [i, c] of data.entries()) {
          const rows = created.get(c.month) ?? [];
          rows.push({ ...c, id: `${c.month}-${i}`, paidCents: null, paidOn: null });
          created.set(c.month, rows);
        }
      },
      findMany: async ({ where }: { where: { month: string } }) =>
        where.month === "2026-11" ? november : (created.get(where.month) ?? []),
    },
    person: {
      findMany: async () => [
        { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
        { id: PERSON_IDS.priya, name: "Priya", isOwner: false },
        { id: PERSON_IDS.sam, name: "Sam", isOwner: false },
        { id: PERSON_IDS.jordan, name: "Jordan", isOwner: false },
      ],
    },
    bill: {
      findUnique: async ({ where }: { where: { month: string } }) =>
        where.month === "2026-11"
          ? {
              currentChargesCents: 41230,
              dueDate: new Date("2026-11-16"),
              paidCents: settled ? 41230 : null,
              paidOn: settled ? new Date("2026-11-16") : null,
            }
          : null,
    },
    billDraft: { findUnique: async () => null },
    messageEvent: { findMany: async ({ where }: { where: { month: string } }) => (where.month === "2026-11" ? monthly : []) },
  };
  const db = { ...tx, $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx) } as unknown as HomeDb;
  return { db, months };
}

afterEach(() => vi.unstubAllEnvs());

describe("startNextMonth", () => {
  it("opens the month after the settled one, and Home then shows it with no bill", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-29T09:00:00+08:00");
    const { db, months } = fakeDb(true);
    const result = await startNextMonth(db);
    expect(startNextMonthResponseSchema.safeParse(result).success).toBe(true);
    expect(result).toEqual({ month: "2026-12" });
    expect(months.has("2026-12")).toBe(true);

    const home = await getHome(db);
    expect(homeResponseSchema.safeParse(home).success).toBe(true);
    expect(home.month).toBe("2026-12");
    expect(home.status).toBe("bill_missing");
    expect(home.nextMonthAction).toBeNull();
    expect(home.rows.find((r) => r.title === "Rent · Jordan")?.badge.label).toBe("Due in 2 days");
  });

  it("answers 409 not_settled while the newest month is not settled, and opens nothing", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-29T09:00:00+08:00");
    const { db, months } = fakeDb(false);
    await expect(startNextMonth(db)).rejects.toMatchObject({ status: 409, code: "not_settled" });
    expect(months.has("2026-12")).toBe(false);
  });

  it("answers 409 once the next month is open: the newest month is then that one, not settled", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-29T09:00:00+08:00");
    const { db } = fakeDb(true, ["2026-11", "2026-12"]);
    await expect(startNextMonth(db)).rejects.toMatchObject({ status: 409 });
  });
});
