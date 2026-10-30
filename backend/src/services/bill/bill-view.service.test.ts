import { HOUSEHOLD_SCHEMA_VERSION } from "@splithouse/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildBillView, type BillViewBillRow } from "@/lib/bill/build-bill-view";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { buildUtilitiesCharges } from "@/lib/split/engine";
import { getBillView, type BillViewDb } from "./bill-view.service";

const BILL: BillViewBillRow = {
  currentChargesCents: 41230,
  billingPeriodStart: new Date("2026-10-03"),
  billingPeriodEnd: new Date("2026-11-02"),
  dueDate: new Date("2026-11-16"),
  lines: [{ label: "Electricity", cents: 26845 }],
  paidCents: null,
  paidOn: null,
  createdAt: new Date("2026-11-02T10:00:00+08:00"),
  file: { filename: "bill.pdf", sizeBytes: 219136, pageCount: 2 },
};

const PEOPLE = [
  { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", isOwner: false },
  { id: PERSON_IDS.sam, name: "Sam", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", isOwner: false },
];

const CHARGES = buildUtilitiesCharges(NOV_2026_CONFIG, { month: "2026-11", currentChargesCents: 41230 }).map((c) => ({
  personId: c.personId,
  payViaPersonId: c.payViaPersonId,
  category: c.category,
  amountCents: c.amountCents,
  dueDate: c.dueDate ? new Date(c.dueDate) : null,
  paidCents: null,
  paidOn: null,
}));

const MESSAGES = [
  { personId: PERSON_IDS.priya, kind: "MONTHLY" as const },
  { personId: PERSON_IDS.jordan, kind: "MONTHLY" as const },
];

/** A database with November open and its bill saved; `newestMonth` is the newest opened month. */
function fakeDb(bill: BillViewBillRow | null, newestMonth = "2026-11") {
  const queries: unknown[] = [];
  const db: BillViewDb = {
    bill: {
      findUnique: async (args) => {
        queries.push(args);
        return bill;
      },
    },
    month: {
      findFirst: async () => ({ month: newestMonth }),
      findUnique: async () => ({
        householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
      }),
    },
    person: { findMany: async () => PEOPLE },
    charge: { findMany: async () => CHARGES },
    messageEvent: { findMany: async () => MESSAGES },
  };
  return { db, queries };
}

describe("getBillView", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("passes what the queries return to the builder, on the month Home shows", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
    expect(await getBillView(fakeDb(BILL).db, "2026-11")).toEqual(
      buildBillView({
        month: "2026-11",
        today: "2026-11-03",
        isActiveMonth: true,
        config: NOV_2026_CONFIG,
        people: PEOPLE,
        charges: CHARGES,
        bill: BILL,
        messages: MESSAGES,
      }),
    );
  });

  it("reads the file's name and page count, never its bytes", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
    const { db, queries } = fakeDb(BILL);
    await getBillView(db, "2026-11");
    expect(queries).toEqual([
      expect.objectContaining({ select: expect.objectContaining({ file: { select: { filename: true, sizeBytes: true, pageCount: true } } }) }),
    ]);
  });

  it("offers no Mark bill paid once a later month is open", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-29T09:00:00+08:00");
    expect((await getBillView(fakeDb(BILL, "2026-12").db, "2026-11")).action).toBeNull();
  });

  it("answers 404 no_bill when the month has no saved bill", async () => {
    await expect(getBillView(fakeDb(null).db, "2026-11")).rejects.toMatchObject({ status: 404, code: "no_bill" });
  });
});
