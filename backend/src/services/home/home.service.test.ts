import { afterEach, describe, expect, it, vi } from "vitest";
import { HOUSEHOLD_SCHEMA_VERSION, homeResponseSchema } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import type { HomeChargeRow } from "@/lib/home/build-home";
import { buildMonthCharges, buildUtilitiesCharges, type EngineCharge } from "@/lib/split/engine";
import { getHome, type HomeDb } from "./home.service";

const VERSION = { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG };

function toRows(charges: EngineCharge[]): HomeChargeRow[] {
  return charges.map((c, i) => ({
    id: `charge-${i}`,
    personId: c.personId,
    payViaPersonId: c.payViaPersonId,
    category: c.category,
    label: c.label,
    amountCents: c.amountCents,
    dueDate: c.dueDate ? new Date(c.dueDate) : null,
    paidCents: null,
    paidOn: null,
  }));
}

const CHARGES = toRows(buildMonthCharges(NOV_2026_CONFIG, "2026-11"));
const CHARGES_WITH_BILL = toRows([
  ...buildMonthCharges(NOV_2026_CONFIG, "2026-11"),
  ...buildUtilitiesCharges(NOV_2026_CONFIG, { month: "2026-11", currentChargesCents: 41230 }),
]);

interface FakeOptions {
  hasDraft?: boolean;
  /** A saved bill, with the utilities charges it creates. */
  hasBill?: boolean;
  /** The people with a MONTHLY message event. */
  messaged?: string[];
  /** Every charge and the bill are paid. Needs `hasBill`. */
  allPaid?: boolean;
}

/** A database where November is either already open or not, with no household version to open it from. */
function fakeDb(
  open: boolean,
  { hasDraft = false, hasBill = false, messaged = [], allPaid = false }: FakeOptions = {},
): HomeDb {
  const paidCharges = CHARGES_WITH_BILL.map((c) => ({ ...c, paidCents: c.amountCents, paidOn: new Date("2026-11-03") }));
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
      findMany: async () => (allPaid ? paidCharges : hasBill ? CHARGES_WITH_BILL : CHARGES),
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
      findUnique: async () =>
        hasBill
          ? {
              currentChargesCents: 41230,
              dueDate: new Date("2026-11-16"),
              paidCents: allPaid ? 41230 : null,
              paidOn: allPaid ? new Date("2026-11-16") : null,
            }
          : null,
    },
    billDraft: { findUnique: async () => (hasDraft ? { id: "draft-1" } : null) },
    messageEvent: {
      findMany: async () =>
        messaged.map((personId) => ({
          personId,
          kind: "MONTHLY",
          chargeId: null,
          openedAt: new Date("2026-11-02T10:00:00+08:00"),
        })),
    },
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

  it("returns the draft status, with a notice that parses, when a bill draft is waiting", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-01T09:00:00+08:00");
    const home = await getHome(fakeDb(true, { hasDraft: true }));
    expect(homeResponseSchema.safeParse(home).success).toBe(true);
    expect(home.status).toBe("draft");
    expect(home.hero.notice?.actions).toHaveLength(2);
  });

  it("returns the unsent status when a bill is saved and no message was opened, and it parses", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-01T09:00:00+08:00");
    const home = await getHome(fakeDb(true, { hasBill: true }));
    expect(homeResponseSchema.safeParse(home).success).toBe(true);
    expect(home.status).toBe("unsent");
    expect(home.hero.compactStatus).toBe("2 messages to send");
    expect(home.primaryAction).toBeNull();
    expect(home.rows.find((r) => r.id === "bill")?.amount).toBe("$412.30");
  });

  it("counts only people who still have no MONTHLY message", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-01T09:00:00+08:00");
    const home = await getHome(fakeDb(true, { hasBill: true, messaged: [PERSON_IDS.priya] }));
    expect(home.status).toBe("unsent");
    expect(home.hero.compactStatus).toBe("1 message to send");
  });

  it("returns the collecting status once every message is out, and it parses", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
    const home = await getHome(fakeDb(true, { hasBill: true, messaged: [PERSON_IDS.priya, PERSON_IDS.jordan] }));
    expect(homeResponseSchema.safeParse(home).success).toBe(true);
    expect(home.status).toBe("collecting");
    expect(home.hero.dateLine).toBe("3 Nov · Collecting");
    expect(home.primaryAction?.label).toBe("Record payment");
    expect(home.rows.find((r) => r.title === "Rent · Jordan")?.badge.label).toBe("Overdue 2 days");
  });

  it("returns the due-today Alert, and it parses, when a payment falls due on the day", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-04T09:00:00+08:00");
    const home = await getHome(fakeDb(true, { hasBill: true, messaged: [PERSON_IDS.priya, PERSON_IDS.jordan] }));
    expect(homeResponseSchema.safeParse(home).success).toBe(true);
    expect(home.hero.dueToday).toEqual({ text: "Jordan’s utilities are due today", amount: "$82.46" });
  });

  it("returns the settled status once every charge and the bill are paid, and it parses", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-29T09:00:00+08:00");
    const home = await getHome(fakeDb(true, { hasBill: true, allPaid: true, messaged: [PERSON_IDS.priya, PERSON_IDS.jordan] }));
    expect(homeResponseSchema.safeParse(home).success).toBe(true);
    expect(home.status).toBe("settled");
    expect(home.hero.dateLine).toBe("29 Nov · Done");
    expect(home.hero.compactStatus).toBe("November is settled");
    expect(home.primaryAction).toBeNull();
  });

  it("stays collecting while charges and the bill are unpaid, however late in the month", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-29T09:00:00+08:00");
    const home = await getHome(fakeDb(true, { hasBill: true, messaged: [PERSON_IDS.priya, PERSON_IDS.jordan] }));
    expect(home.status).toBe("collecting");
  });

  it("answers 409 when no month can be open because there is no household yet", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-01T09:00:00+08:00");
    await expect(getHome(fakeDb(false))).rejects.toMatchObject({ status: 409 });
  });
});
