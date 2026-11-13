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
  /** Every charge is paid and the bill is not. Needs `hasBill`. */
  chargesPaid?: boolean;
  /** Unpaid charges in earlier months, as the payer read for them. */
  earlierUnpaid?: { personId: string; payViaPersonId: string | null }[];
}

/** A database where November is either already open or not, with no household version to open it from. */
function fakeDb(
  open: boolean,
  { hasDraft = false, hasBill = false, messaged = [], allPaid = false, chargesPaid = false, earlierUnpaid = [] }: FakeOptions = {},
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
      // An earlier-month read filters on `month: { lt }`; the month itself on its key.
      findMany: async (args: { where: { month: unknown } }) =>
        typeof args.where.month === "object"
          ? earlierUnpaid.map((payer, i) => ({ ...CHARGES[0], id: `earlier-${i}`, month: "2026-10", ...payer }))
          : allPaid || chargesPaid
            ? paidCharges
            : hasBill
              ? CHARGES_WITH_BILL
              : CHARGES,
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
    expect(home.footer.map((b) => [b.label, b.variant, b.count])).toEqual([
      ["Send message", "solid", 2],
      ["Record payment", "solid", 3],
    ]);
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
    expect(home.footer.map((b) => [b.label, b.variant, b.count])).toEqual([
      ["Send message", "outline", null],
      ["Record payment", "solid", 3],
    ]);
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
    expect(home.footer).toEqual([]);
  });

  it("stays collecting while charges and the bill are unpaid, however late in the month", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-29T09:00:00+08:00");
    const home = await getHome(fakeDb(true, { hasBill: true, messaged: [PERSON_IDS.priya, PERSON_IDS.jordan] }));
    expect(home.status).toBe("collecting");
  });

  it("makes Mark bill paid the only collecting footer button once the bill's due date has come", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-16T09:00:00+08:00");
    const home = await getHome(fakeDb(true, { hasBill: true, messaged: [PERSON_IDS.priya, PERSON_IDS.jordan] }));
    expect(home.status).toBe("collecting");
    expect(home.footer.map((b) => b.label)).toEqual(["Mark bill paid"]);
  });

  it("returns the bill_due status once everyone has paid but the bill is not, and it parses", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-12T09:00:00+08:00");
    const home = await getHome(
      fakeDb(true, { hasBill: true, chargesPaid: true, messaged: [PERSON_IDS.priya, PERSON_IDS.jordan] }),
    );
    expect(homeResponseSchema.safeParse(home).success).toBe(true);
    expect(home.status).toBe("bill_due");
    expect(home.hero.dateLine).toBe("12 Nov · Bill due 16 Nov");
    expect(home.footer.map((b) => b.label)).toEqual(["Mark bill paid"]);
  });

  it("counts an earlier month's late payer in Record payment, once per payer", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-12T09:00:00+08:00");
    const earlierUnpaid = [
      { personId: PERSON_IDS.sam, payViaPersonId: PERSON_IDS.priya },
      { personId: PERSON_IDS.priya, payViaPersonId: null },
    ];
    const home = await getHome(
      fakeDb(true, { hasBill: true, chargesPaid: true, earlierUnpaid, messaged: [PERSON_IDS.priya, PERSON_IDS.jordan] }),
    );
    expect(home.footer.map((b) => [b.label, b.count])).toEqual([
      ["Record payment", 1],
      ["Mark bill paid", null],
    ]);
  });

  it("answers 409 setup_incomplete while no month has opened", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-01T09:00:00+08:00");
    await expect(getHome(fakeDb(false))).rejects.toMatchObject({ status: 409, code: "setup_incomplete" });
  });
});

describe("getHome nextMonthAction", () => {
  it("offers the Close dialog for a settled month, and it parses", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-29T09:00:00+08:00");
    const home = await getHome(fakeDb(true, { hasBill: true, allPaid: true, messaged: [PERSON_IDS.priya, PERSON_IDS.jordan] }));
    expect(homeResponseSchema.safeParse(home).success).toBe(true);
    expect(home.nextMonthAction).toEqual({
      label: "Start next month",
      dialog: {
        title: "Close November?",
        body: "This closes November 2026 and starts December. You can’t undo this.",
        items: [
          "November moves to History and becomes read-only",
          "Changes to any household configuration will take effect after December",
        ],
      },
    });
  });

  it("offers nothing while the month is not settled", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-29T09:00:00+08:00");
    const home = await getHome(fakeDb(true, { hasBill: true, messaged: [PERSON_IDS.priya, PERSON_IDS.jordan] }));
    expect(home.nextMonthAction).toBeNull();
  });
});
