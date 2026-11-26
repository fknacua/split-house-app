import { HOUSEHOLD_SCHEMA_VERSION, recordPaymentSheetSchema } from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { getRecordPaymentSheet, previewRecordPayment, type RecordPaymentSheetDb } from "./record-payment.service";

const { alex, priya, sam, jordan } = PERSON_IDS;
const VERSION = { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG };

function row(id: string, personId: string, label: string, amountCents: number, due: string | null, payVia: string | null = null) {
  return {
    id,
    personId,
    month: "2026-11",
    category: label === "Rent" ? ("RENT" as const) : ("UTILITIES" as const),
    label,
    amountCents,
    dueDate: due ? new Date(`${due}T00:00:00+08:00`) : null,
    payViaPersonId: payVia,
    paidCents: null,
    householdVersion: VERSION,
  };
}

const UNPAID = [
  row("jordan-rent", jordan, "Rent", 95000, "2026-11-01"),
  row("jordan-utilities", jordan, "Utilities", 8246, "2026-11-04"),
  row("priya-rent", priya, "Rent", 167500, "2026-11-07"),
  row("sam-utilities", sam, "Utilities", 8246, null, priya),
];

// Charges the unpaid query doesn't return, for Mark paid's look-up.
const OTHERS: Record<string, { paidCents: number | null }> = {
  "jordan-paid": { paidCents: 95000 },
  "alex-rent": { paidCents: null },
};

/** A database with November active and open, unless told otherwise; records what each query asked for. */
function fakeDb({ open = true, unpaid = UNPAID } = {}) {
  const asked: unknown[] = [];
  const db: RecordPaymentSheetDb = {
    month: {
      findFirst: async () => ({ month: "2026-11" }),
      findUnique: async () => (open ? { month: "2026-11" } : null),
    },
    person: {
      findMany: async () => [
        { id: alex, name: "Alex", isOwner: true },
        { id: priya, name: "Priya", isOwner: false },
        { id: sam, name: "Sam", isOwner: false },
        { id: jordan, name: "Jordan", isOwner: false },
      ],
    },
    charge: {
      findMany: async (args) => {
        asked.push(args.where);
        return unpaid;
      },
      findUnique: async (args) => OTHERS[args.where.id] ?? null,
    },
  };
  return { db, asked };
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("getRecordPaymentSheet", () => {
  it("reads the unpaid charges up to the active month and opens with nobody picked", async () => {
    const { db, asked } = fakeDb();
    const sheet = recordPaymentSheetSchema.parse(await getRecordPaymentSheet(db, {}));
    expect(asked).toEqual([{ month: { lte: "2026-11" }, paidCents: null, amountCents: { gt: 0 } }]);
    expect(sheet.from.personId).toBeNull();
    expect(sheet.from.options.map((o) => o.name)).toEqual(["Jordan", "Priya"]);
  });

  it("picks a person with nothing ticked", async () => {
    const sheet = await getRecordPaymentSheet(fakeDb().db, { personId: jordan });
    expect(sheet.from.personId).toBe(jordan);
    expect(sheet.for.rows.every((r) => !r.ticked)).toBe(true);
  });

  it("from Mark paid, picks the person who collects the charge and ticks it", async () => {
    const sheet = await getRecordPaymentSheet(fakeDb().db, { chargeIds: ["sam-utilities"] });
    expect(sheet.from.personId).toBe(priya);
    expect(sheet.for.rows.filter((r) => r.ticked).map((r) => r.chargeId)).toEqual(["sam-utilities"]);
  });

  it("from a reminder's Paid, ticks every charge still in the payer's list", async () => {
    const sheet = await getRecordPaymentSheet(fakeDb().db, {
      chargeIds: ["jordan-paid", "jordan-utilities", "jordan-rent", "priya-rent"],
    });
    expect(sheet.from.personId).toBe(jordan);
    expect(sheet.record.request).toEqual({ personId: jordan, chargeIds: ["jordan-rent", "jordan-utilities"] });
  });

  it("accepts the person with their own charge", async () => {
    const sheet = await getRecordPaymentSheet(fakeDb().db, { personId: priya, chargeIds: ["sam-utilities"] });
    expect(sheet.record.request).toEqual({ personId: priya, chargeIds: ["sam-utilities"] });
  });

  it("opens Everyone has paid when nothing is unpaid", async () => {
    const sheet = await getRecordPaymentSheet(fakeDb({ unpaid: [] }).db, {});
    expect(sheet.settled?.title).toBe("Everyone has paid");
  });

  it.each([
    ["the month isn't open", { open: false }, {}, 404, "no_month"],
    ["the person has nothing to pay", {}, { personId: sam }, 404, "no_person"],
    ["the person is the owner", {}, { personId: alex }, 404, "no_person"],
    ["the charge doesn't exist", {}, { chargeIds: ["nope"] }, 404, "no_charge"],
    ["the charge is already paid", {}, { chargeIds: ["jordan-paid"] }, 409, "already_paid"],
    ["the charge has nothing to record", {}, { chargeIds: ["alex-rent"] }, 409, "nothing_to_pay"],
    ["the charge is someone else's", {}, { personId: jordan, chargeIds: ["priya-rent"] }, 409, "not_their_charge"],
  ])("refuses when %s", async (_, options, query, status, code) => {
    await expect(getRecordPaymentSheet(fakeDb(options).db, query)).rejects.toMatchObject({ status, code });
  });
});

describe("previewRecordPayment", () => {
  it("returns the sheet with the new ticks, leaving out ids not in the person's list", async () => {
    const sheet = await previewRecordPayment(fakeDb().db, {
      personId: jordan,
      chargeIds: ["jordan-utilities", "jordan-rent", "priya-rent"],
    });
    expect(sheet.record).toEqual({ label: "Record $1,032.46", request: { personId: jordan, chargeIds: ["jordan-rent", "jordan-utilities"] } });
  });

  it.each([
    ["the month isn't open", { open: false }, jordan, "no_month"],
    ["the person has nothing to pay", {}, sam, "no_person"],
  ])("refuses when %s", async (_, options, personId, code) => {
    await expect(previewRecordPayment(fakeDb(options).db, { personId, chargeIds: [] })).rejects.toMatchObject({ status: 404, code });
  });
});
