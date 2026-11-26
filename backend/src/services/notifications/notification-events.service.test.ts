import { notificationAcknowledgeResponseSchema } from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeEventTables } from "@/lib/fixtures/notification-events";
import {
  acknowledgeNotifications,
  beginSettledCheck,
  recordUnusualBill,
  type NotificationAcknowledgeDb,
  type SettledEventsTx,
  type UnusualBillEventsTx,
} from "./notification-events.service";

interface Row {
  month: string;
  isOwner: boolean;
  paidCents: number | null;
}

/**
 * November with its bill marked paid and one unpaid charge of Jordan's, the owner's own charge unpaid (it never
 * counts), and FYI updates on unless `fyi` is false. Counts the reads, so a check with FYI off can be seen to read
 * nothing.
 */
function fakeTx({ fyi = true, billPaid = true } = {}) {
  const events = fakeEventTables({ fyi });
  const charges: Row[] = [
    { month: "2026-11", isOwner: true, paidCents: null },
    { month: "2026-11", isOwner: false, paidCents: null },
  ];
  const bills = [{ month: "2026-11", paidCents: billPaid ? 41230 : null }];
  let reads = 0;
  const tx: SettledEventsTx = {
    ...events.tables,
    bill: {
      findMany: async ({ where }) => {
        reads++;
        return bills.filter((b) => where.month.in.includes(b.month));
      },
    },
    charge: {
      count: async ({ where }) => {
        reads++;
        return charges.filter((c) => c.month === where.month && !c.isOwner && c.paidCents === null).length;
      },
    },
  };
  return { tx, charges, bills, stored: events.stored, reads: () => reads };
}

/** Pays every charge, as the write between the two reads. */
const payAll = (charges: Row[]) => charges.forEach((c) => (c.paidCents = 1));

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-29T14:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("beginSettledCheck", () => {
  it("records a month that turns settled, keyed by the Singapore date", async () => {
    const { tx, charges, stored } = fakeTx();
    const check = await beginSettledCheck(tx, ["2026-11", "2026-11"]);
    payAll(charges);
    await check.finish();
    expect(stored).toEqual([{ key: "settled:2026-11:2026-11-29", typeKey: "monthSettled", params: { month: "November" } }]);
  });

  it("records a month settled by the bill being marked paid", async () => {
    const { tx, charges, bills, stored } = fakeTx({ billPaid: false });
    payAll(charges);
    const check = await beginSettledCheck(tx, ["2026-11"]);
    bills[0].paidCents = 41230;
    await check.finish();
    expect(stored.map((e) => e.key)).toEqual(["settled:2026-11:2026-11-29"]);
  });

  it("records nothing for a month that was settled already, or that is still not settled", async () => {
    const already = fakeTx();
    payAll(already.charges);
    const check = await beginSettledCheck(already.tx, ["2026-11"]);
    await check.finish();
    expect(already.stored).toEqual([]);

    const still = fakeTx({ billPaid: false });
    const again = await beginSettledCheck(still.tx, ["2026-11"]);
    payAll(still.charges);
    await again.finish();
    expect(still.stored).toEqual([]);
  });

  it("records nothing when a write unsettles the month", async () => {
    const { tx, charges, stored } = fakeTx();
    payAll(charges);
    const check = await beginSettledCheck(tx, ["2026-11"]);
    charges[1].paidCents = null;
    await check.finish();
    expect(stored).toEqual([]);
  });

  it("settling again the same day is skipped by its key; on another day it records again", async () => {
    const { tx, charges, stored } = fakeTx();
    const settle = async () => {
      charges[1].paidCents = null;
      const check = await beginSettledCheck(tx, ["2026-11"]);
      payAll(charges);
      await check.finish();
    };
    await settle();
    await settle();
    vi.stubEnv("DEV_NOW", "2026-11-30T09:00:00+08:00");
    await settle();
    expect(stored.map((e) => e.key)).toEqual(["settled:2026-11:2026-11-29", "settled:2026-11:2026-11-30"]);
  });

  it("reads nothing and records nothing with FYI updates off", async () => {
    const { tx, charges, stored, reads } = fakeTx({ fyi: false });
    const check = await beginSettledCheck(tx, ["2026-11"]);
    payAll(charges);
    await check.finish();
    expect([stored, reads()]).toEqual([[], 0]);
  });
});

describe("recordUnusualBill", () => {
  /** Three saved bills before December averaging $400.00. */
  function fakeBillTx({ fyi = true } = {}) {
    const events = fakeEventTables({ fyi });
    const asked: unknown[] = [];
    const tx: UnusualBillEventsTx = {
      ...events.tables,
      bill: {
        findMany: async (args) => {
          asked.push(args);
          return [{ currentChargesCents: 38000 }, { currentChargesCents: 40000 }, { currentChargesCents: 42000 }];
        },
      },
    };
    return { tx, stored: events.stored, asked };
  }

  it("records an unusual bill once per month, with the latest three bills before it compared", async () => {
    const { tx, stored, asked } = fakeBillTx();
    await recordUnusualBill(tx, "2026-12", 52800);
    await recordUnusualBill(tx, "2026-12", 52800);
    expect(stored).toEqual([
      {
        key: "unusual:2026-12",
        typeKey: "unusualBill",
        params: { month: "December", amount: "$528.00", change: "32% higher" },
      },
    ]);
    expect(asked[0]).toEqual({
      where: { month: { lt: "2026-12" } },
      orderBy: { month: "desc" },
      take: 3,
      select: { currentChargesCents: true },
    });
  });

  it("records nothing for a bill in range, or with FYI updates off", async () => {
    const inRange = fakeBillTx();
    await recordUnusualBill(inRange.tx, "2026-12", 41000);
    expect(inRange.stored).toEqual([]);

    const off = fakeBillTx({ fyi: false });
    await recordUnusualBill(off.tx, "2026-12", 52800);
    expect([off.stored, off.asked]).toEqual([[], []]);
  });
});

describe("acknowledgeNotifications", () => {
  function fakeDb() {
    const rows = [
      { key: "settled:2026-11:2026-11-29", status: "PENDING", fireAt: null as Date | null },
      { key: "unusual:2026-12", status: "SCHEDULED", fireAt: new Date("2026-12-03T10:00:05+08:00") },
      { key: "unusual:2026-10", status: "EXPIRED", fireAt: null },
    ];
    const db: NotificationAcknowledgeDb = {
      notificationEvent: {
        updateMany: async ({ where, data }) => {
          const hit = rows.filter((r) => r.key === where.key && r.status === where.status);
          hit.forEach((r) => Object.assign(r, data));
          return { count: hit.length };
        },
        findMany: async ({ where }) =>
          rows.filter((r) => where.key.in.includes(r.key) && r.status === where.status).map((r) => ({ key: r.key })),
      },
    };
    return { db, rows };
  }

  it("schedules a pending event at the phone's time; an acknowledged one keeps its time; others are left out", async () => {
    const { db, rows } = fakeDb();
    const response = await acknowledgeNotifications(db, {
      events: [
        { id: "settled:2026-11:2026-11-29", at: "2026-11-29T14:03:05+08:00" },
        { id: "unusual:2026-12", at: "2026-12-04T09:00:00+08:00" },
        { id: "unusual:2026-10", at: "2026-11-29T14:03:05+08:00" },
        { id: "nothing", at: "2026-11-29T14:03:05+08:00" },
      ],
    });
    expect(notificationAcknowledgeResponseSchema.parse(response)).toEqual({
      acknowledged: ["settled:2026-11:2026-11-29", "unusual:2026-12"],
    });
    expect(rows.map((r) => [r.status, r.fireAt?.toISOString() ?? null])).toEqual([
      ["SCHEDULED", "2026-11-29T06:03:05.000Z"],
      ["SCHEDULED", "2026-12-03T02:00:05.000Z"],
      ["EXPIRED", null],
    ]);
  });

  it("answers nothing for no events", async () => {
    expect(await acknowledgeNotifications(fakeDb().db, { events: [] })).toEqual({ acknowledged: [] });
  });
});
