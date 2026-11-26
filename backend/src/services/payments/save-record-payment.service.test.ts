import { recordPaymentResponseSchema, type RecordPaymentRequest } from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PERSON_IDS } from "@/lib/fixtures/household";
import { fakeEventTables } from "@/lib/fixtures/notification-events";
import { saveRecordPayment, type SaveRecordPaymentDb } from "./save-record-payment.service";

const { alex, priya, sam, jordan } = PERSON_IDS;

interface Row {
  id: string;
  month: string;
  personId: string;
  payViaPersonId: string | null;
  amountCents: number;
  paidCents: number | null;
}

const ROWS: Row[] = [
  { id: "jordan-rent", month: "2026-11", personId: jordan, payViaPersonId: null, amountCents: 95000, paidCents: null },
  { id: "jordan-oct-rent", month: "2026-10", personId: jordan, payViaPersonId: null, amountCents: 95000, paidCents: null },
  { id: "jordan-paid", month: "2026-11", personId: jordan, payViaPersonId: null, amountCents: 8246, paidCents: 8246 },
  { id: "jordan-credit", month: "2026-11", personId: jordan, payViaPersonId: null, amountCents: -500, paidCents: null },
  { id: "sam-utilities", month: "2026-11", personId: sam, payViaPersonId: priya, amountCents: 8246, paidCents: null },
  { id: "priya-rent", month: "2026-11", personId: priya, payViaPersonId: null, amountCents: 167500, paidCents: null },
];

/**
 * A database whose transaction works on a copy of the rows and keeps the copy only when the callback
 * succeeds, as a rollback would. `stolen` charges are paid by someone else just before the update.
 */
function fakeDb({ stolen = [] as string[], fyi = false } = {}) {
  let rows = ROWS.map((r) => ({ ...r, paidOn: null as Date | null, paidByPersonId: null as string | null }));
  const events = fakeEventTables({ fyi });
  // October's bill is marked paid, November's isn't.
  const bills = [
    { month: "2026-10", paidCents: 41230 },
    { month: "2026-11", paidCents: null },
  ];
  const db: SaveRecordPaymentDb = {
    $transaction: async (fn) => {
      const copy = rows.map((r) => ({ ...r }));
      const result = await fn({
        ...events.tables,
        bill: { findMany: async ({ where }) => bills.filter((b) => where.month.in.includes(b.month)) },
        person: {
          findUnique: async ({ where }) =>
            ([alex, priya, sam, jordan] as string[]).includes(where.id) ? { isOwner: where.id === alex } : null,
        },
        charge: {
          findMany: async ({ where }) => copy.filter((r) => where.id.in.includes(r.id)),
          count: async ({ where }) => copy.filter((r) => r.month === where.month && r.paidCents === null).length,
          updateMany: async ({ where, data }) => {
            const target = copy.find((r) => r.id === where.id && r.paidCents === null && !stolen.includes(r.id));
            if (!target) return { count: 0 };
            Object.assign(target, data);
            return { count: 1 };
          },
        },
      });
      rows = copy;
      return result;
    },
  };
  return { db, rows: () => rows, events: events.stored };
}

const save = (db: SaveRecordPaymentDb, values: Partial<RecordPaymentRequest>) =>
  saveRecordPayment(db, { personId: jordan, chargeIds: ["jordan-rent"], paidOn: "2026-11-03", ...values });

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("saveRecordPayment", () => {
  it("pays every charge in full, with the From person as payer, a late one included", async () => {
    const { db, rows } = fakeDb();
    const result = recordPaymentResponseSchema.parse(
      await save(db, { chargeIds: ["jordan-oct-rent", "jordan-rent", "jordan-rent"], paidOn: "2026-11-02" }),
    );
    expect(result).toEqual({ personId: jordan, chargeIds: ["jordan-oct-rent", "jordan-rent"], months: ["2026-11", "2026-10"] });
    const paid = rows().filter((r) => r.paidCents !== null && r.id !== "jordan-paid");
    expect(paid.map((r) => [r.id, r.paidCents, r.paidOn?.toISOString().slice(0, 10), r.paidByPersonId])).toEqual([
      ["jordan-rent", 95000, "2026-11-02", jordan],
      ["jordan-oct-rent", 95000, "2026-11-02", jordan],
    ]);
  });

  it("records the settled FYI of a month the payment settles, with FYI updates on, and only then", async () => {
    const on = fakeDb({ fyi: true });
    await save(on.db, { chargeIds: ["jordan-oct-rent", "jordan-rent"] });
    // October's last charge is paid and its bill is; November still has unpaid charges and an unpaid bill.
    expect(on.events.map((e) => e.key)).toEqual(["settled:2026-10:2026-11-03"]);

    const off = fakeDb();
    await save(off.db, { chargeIds: ["jordan-oct-rent"] });
    expect(off.events).toEqual([]);
  });

  it("records a collected charge as paid by the person who collects it", async () => {
    const { db, rows } = fakeDb();
    await save(db, { personId: priya, chargeIds: ["priya-rent", "sam-utilities"] });
    expect(rows().find((r) => r.id === "sam-utilities")).toMatchObject({ paidCents: 8246, paidByPersonId: priya });
  });

  it.each([
    ["without a day", { paidOn: null }, 422, "no_date"],
    ["with the day left out", { paidOn: undefined }, 422, "no_date"],
    ["with a day after today", { paidOn: "2026-11-04" }, 400, "invalid_request"],
    ["for an unknown person", { personId: "nobody" }, 404, "no_person"],
    ["from the owner", { personId: alex }, 404, "no_person"],
    ["for an unknown charge", { chargeIds: ["jordan-rent", "nope"] }, 404, "no_charge"],
    ["for a paid charge", { chargeIds: ["jordan-rent", "jordan-paid"] }, 409, "already_paid"],
    ["for a credit", { chargeIds: ["jordan-credit"] }, 409, "nothing_to_pay"],
    ["for someone else's charge", { chargeIds: ["jordan-rent", "priya-rent"] }, 409, "not_their_charge"],
    ["for a charge collected through someone else", { personId: sam, chargeIds: ["sam-utilities"] }, 409, "collected_elsewhere"],
  ])("refuses a payment %s, paying nothing", async (_, values, status, code) => {
    const { db, rows } = fakeDb();
    await expect(save(db, values)).rejects.toMatchObject({ status, code });
    expect(rows().filter((r) => r.paidCents !== null).map((r) => r.id)).toEqual(["jordan-paid"]);
  });

  it("rolls back every charge when one is paid elsewhere first", async () => {
    const { db, rows } = fakeDb({ stolen: ["jordan-oct-rent"] });
    await expect(save(db, { chargeIds: ["jordan-rent", "jordan-oct-rent"] })).rejects.toMatchObject({
      status: 409,
      code: "already_paid",
    });
    expect(rows().find((r) => r.id === "jordan-rent")?.paidCents).toBeNull();
  });
});
