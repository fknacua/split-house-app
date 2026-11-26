import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeEventTables } from "@/lib/fixtures/notification-events";
import { markBillPaid, type MarkBillPaidDb } from "./mark-bill-paid.service";

/**
 * A November bill, unpaid or paid, with `unpaid` charges of others left; records the update it gets and the events
 * stored.
 */
function fakeDb(bill: { paidCents: number | null } | null, { fyi = false, unpaid = 0 } = {}) {
  const updates: unknown[] = [];
  const events = fakeEventTables({ fyi });
  const db: MarkBillPaidDb = {
    $transaction: (fn) =>
      fn({
        ...events.tables,
        bill: {
          findUnique: async () => bill,
          findMany: async () => (bill ? [{ month: "2026-11", paidCents: bill.paidCents }] : []),
          updateMany: async (args) => {
            updates.push(args);
            if (!bill || bill.paidCents !== null) return { count: 0 };
            bill.paidCents = args.data.paidCents;
            return { count: 1 };
          },
        },
        charge: { count: async () => unpaid },
      }),
  };
  return { db, updates, events: events.stored };
}

describe("markBillPaid", () => {
  beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-16T09:00:00+08:00"));
  afterEach(() => vi.unstubAllEnvs());

  it("stores the amount and the day, only on an unpaid bill", async () => {
    const { db, updates } = fakeDb({ paidCents: null });
    expect(await markBillPaid(db, "2026-11", { paidCents: 41000, paidOn: "2026-11-16" })).toEqual({ month: "2026-11" });
    expect(updates).toEqual([
      { where: { month: "2026-11", paidCents: null }, data: { paidCents: 41000, paidOn: new Date("2026-11-16") } },
    ]);
  });

  it("records the settled FYI when everyone has paid already, with FYI updates on", async () => {
    const settles = fakeDb({ paidCents: null }, { fyi: true });
    await markBillPaid(settles.db, "2026-11", { paidCents: 41230, paidOn: "2026-11-16" });
    expect(settles.events.map((e) => e.key)).toEqual(["settled:2026-11:2026-11-16"]);

    const stillOwed = fakeDb({ paidCents: null }, { fyi: true, unpaid: 1 });
    await markBillPaid(stillOwed.db, "2026-11", { paidCents: 41230, paidOn: "2026-11-16" });
    expect(stillOwed.events).toEqual([]);

    const off = fakeDb({ paidCents: null });
    await markBillPaid(off.db, "2026-11", { paidCents: 41230, paidOn: "2026-11-16" });
    expect(off.events).toEqual([]);
  });

  it("answers 400 for a day after today", async () => {
    await expect(
      markBillPaid(fakeDb({ paidCents: null }).db, "2026-11", { paidCents: 41230, paidOn: "2026-11-17" }),
    ).rejects.toMatchObject({ status: 400, code: "invalid_request" });
  });

  it("answers 404 no_bill when the month has no saved bill", async () => {
    await expect(markBillPaid(fakeDb(null).db, "2026-11", { paidCents: 41230, paidOn: "2026-11-16" })).rejects.toMatchObject({
      status: 404,
      code: "no_bill",
    });
  });

  it("answers 409 bill_paid when the bill is already paid", async () => {
    await expect(
      markBillPaid(fakeDb({ paidCents: 41230 }).db, "2026-11", { paidCents: 41230, paidOn: "2026-11-16" }),
    ).rejects.toMatchObject({ status: 409, code: "bill_paid" });
  });
});
