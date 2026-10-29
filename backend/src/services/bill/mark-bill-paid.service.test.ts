import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markBillPaid, type MarkBillPaidDb } from "./mark-bill-paid.service";

/** A November bill, unpaid or paid; records the update it gets. */
function fakeDb(bill: { paidCents: number | null } | null) {
  const updates: unknown[] = [];
  const db: MarkBillPaidDb = {
    bill: {
      findUnique: async () => bill,
      updateMany: async (args) => {
        updates.push(args);
        return { count: bill && bill.paidCents === null ? 1 : 0 };
      },
    },
  };
  return { db, updates };
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
