import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOUSEHOLD_SCHEMA_VERSION } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { NOTIFICATION_GROUP_ROWS, NOTIFICATION_TYPE_ROWS } from "@/lib/notifications/rows";
import type { StoredNotificationType } from "@/lib/notifications/types";
import { getNotificationPlan, type NotificationPlanDb } from "./notification-plan.service";

/** A stored event, as the plan reads it. */
type EventRow = Awaited<ReturnType<NotificationPlanDb["notificationEvent"]["findMany"]>>[number];

const NOV = { month: "2026-11", householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG } };

const RENT = {
  id: "rent-jordan",
  month: "2026-11",
  personId: PERSON_IDS.jordan,
  payViaPersonId: null,
  category: "RENT" as const,
  label: "Rent",
  amountCents: 95000,
  dueDate: new Date("2026-11-01"),
  correctsCharge: null,
};

/**
 * A household with the given opened months, Jordan's unpaid rent, no bills, an aircon charge added on 1 Sep, the
 * seeded types (or `types`) and the seeded switches with `on` turned on and `off` turned off.
 */
function fakeDb(
  months: (typeof NOV)[],
  {
    on = [],
    off = [],
    types = NOTIFICATION_TYPE_ROWS,
    events = [],
  }: { on?: string[]; off?: string[]; types?: readonly unknown[]; events?: EventRow[] } = {},
) {
  const calls: Record<string, unknown> = {};
  const db: NotificationPlanDb = {
    month: { findMany: async () => months },
    person: {
      findMany: async () => [
        { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
        { id: PERSON_IDS.jordan, name: "Jordan", isOwner: false },
      ],
    },
    charge: {
      findMany: async (args) => {
        calls.charge = args.where;
        return [RENT];
      },
      findFirst: async (args) => {
        calls.aircon = args;
        return { createdAt: new Date("2026-09-01T12:00:00+08:00") };
      },
    },
    bill: {
      findMany: async (args) => {
        calls.bill = args.where;
        return [];
      },
    },
    notificationGroup: {
      findMany: async () =>
        NOTIFICATION_GROUP_ROWS.map((g) => ({
          ...g,
          enabled: (g.enabled || on.includes(g.key)) && !off.includes(g.key),
        })),
    },
    notificationType: { findMany: async () => [...types] as StoredNotificationType[] },
    messageEvent: {
      findMany: async (args) => {
        calls.messaged = args;
        return [{ personId: PERSON_IDS.jordan }];
      },
    },
    notificationEvent: {
      findMany: async (args) => {
        calls.events = args.where;
        return events;
      },
      updateMany: async (args) => {
        calls.expired = args;
        return { count: args.where.id.in.length };
      },
    },
  };
  return { db, calls };
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-25T10:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("getNotificationPlan", () => {
  it("plans the next 14 days from the stored data, types and switches", async () => {
    const { db, calls } = fakeDb([NOV]);
    const { notifications } = await getNotificationPlan(db);
    const ids = notifications.map((n) => n.id);
    expect(ids.filter((id) => id.startsWith(`collectPayments:overdue:${PERSON_IDS.jordan}:`))).toHaveLength(14);
    expect(notifications.find((n) => n.id.startsWith("collectPayments:"))?.title).toBe("Collect $950.00 from Jordan");
    // November's bill isn't saved: overdue from tomorrow; December's is due tomorrow on 1 Dec.
    expect(ids.filter((id) => id.startsWith("uploadBill:overdue:2026-11:"))).toHaveLength(14);
    expect(ids).toContain("uploadBill:dueTomorrow:2026-12:2026-12-01");
    // FYI updates are off by default.
    expect(ids.filter((id) => id.startsWith("airconDue:"))).toEqual([]);
    // Unpaid charges of anyone but the owner, the unpaid bills plus the upload months' saved bills, the latest aircon.
    expect(calls.charge).toEqual({ paidCents: null, amountCents: { gt: 0 }, person: { isOwner: false } });
    expect(calls.bill).toEqual({ OR: [{ paidCents: null }, { month: { in: ["2026-11", "2026-12"] } }] });
    expect(calls.aircon).toEqual({
      where: { category: "AIRCON" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    // Who has had the active month’s monthly message, so an overdue reminder to them gets Nudge.
    expect(calls.messaged).toEqual({
      where: { month: "2026-11", kind: "MONTHLY" },
      select: { personId: true },
      distinct: ["personId"],
    });
    const overdue = notifications.find((n) => n.id.startsWith("collectPayments:overdue:"));
    expect(overdue?.actions.map((a) => a.kind)).toEqual(["paid", "nudge"]);
  });

  it("follows the saved switches", async () => {
    const { db } = fakeDb([NOV], { on: ["fyi"], off: ["uploadBill", "collectPayments"] });
    const { notifications } = await getNotificationPlan(db);
    // 1 Sep plus 90 days.
    expect(notifications.map((n) => n.id)).toEqual(["airconDue:2026-11-30"]);
  });

  it("lists the pending and acknowledged event FYIs, and expires pending ones older than 3 days", async () => {
    const pending = {
      id: "e-new",
      key: "settled:2026-11:2026-11-25",
      typeKey: "monthSettled",
      params: { month: "November" },
      status: "PENDING" as const,
      createdAt: new Date("2026-11-25T09:59:00+08:00"),
      fireAt: null,
    };
    const old = { ...pending, id: "e-old", key: "unusual:2026-11", typeKey: "unusualBill", createdAt: new Date("2026-11-21T12:00:00+08:00") };
    const acked = { ...pending, id: "e-acked", key: "settled:2026-10:2026-11-25", status: "SCHEDULED" as const, fireAt: new Date("2026-11-25T10:00:30+08:00") };
    const { db, calls } = fakeDb([NOV], { on: ["fyi"], off: ["uploadBill", "collectPayments"], events: [pending, old, acked] });
    const { notifications } = await getNotificationPlan(db);
    expect(notifications.map((n) => [n.id, n.at, n.acknowledge])).toEqual([
      ["settled:2026-11:2026-11-25", "2026-11-25T10:00:05+08:00", true],
      ["settled:2026-10:2026-11-25", "2026-11-25T10:00:30+08:00", false],
      ["airconDue:2026-11-30", "2026-11-30T08:00:00+08:00", false],
    ]);
    expect(calls.events).toEqual({
      OR: [{ status: "PENDING" }, { status: "SCHEDULED", fireAt: { gt: new Date("2026-11-25T10:00:00+08:00") } }],
    });
    expect(calls.expired).toEqual({ where: { id: { in: ["e-old"] }, status: "PENDING" }, data: { status: "EXPIRED" } });
  });

  it("expires nothing when no pending event is old", async () => {
    const { db, calls } = fakeDb([NOV]);
    await getNotificationPlan(db);
    expect(calls.expired).toBeUndefined();
  });

  it("refuses a stored type the code doesn't know instead of scheduling it", async () => {
    const { db } = fakeDb([NOV], { types: [{ key: "x", groupKey: "fyi", kind: "weekly", rule: {} }] });
    await expect(getNotificationPlan(db)).rejects.toThrow();
  });

  it("answers an empty plan before First run", async () => {
    const { db } = fakeDb([]);
    expect(await getNotificationPlan(db)).toEqual({ notifications: [] });
  });
});
