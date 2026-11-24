import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOUSEHOLD_SCHEMA_VERSION } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { getNotificationPlan, type NotificationPlanDb } from "./notification-plan.service";

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

/** A household with the given opened months, Jordan's unpaid rent, no bills and the given stored toggles. */
function fakeDb(months: (typeof NOV)[], toggles: unknown = null) {
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
    },
    bill: {
      findMany: async (args) => {
        calls.bill = args.where;
        return [];
      },
    },
    settings: { findUnique: async () => (toggles === null ? null : { notifications: toggles }) },
  };
  return { db, calls };
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-25T10:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("getNotificationPlan", () => {
  it("plans from the stored data with the default toggles", async () => {
    const { db, calls } = fakeDb([NOV]);
    const { notifications } = await getNotificationPlan(db);
    expect(notifications.find((n) => n.id === "rent:rent-jordan")?.title).toBe("Collect Jordan’s rent");
    expect(notifications.filter((n) => n.id.startsWith("upload:"))).toHaveLength(35);
    // Unpaid charges of anyone but the owner, and the unpaid bills plus this month's and next month's.
    expect(calls.charge).toEqual({ paidCents: null, amountCents: { gt: 0 }, person: { isOwner: false } });
    expect(calls.bill).toEqual({ OR: [{ paidCents: null }, { month: { in: ["2026-11", "2026-12"] } }] });
  });

  it("follows the saved toggles", async () => {
    const { db } = fakeDb([NOV], { uploadBill: false, collectRent: true });
    const { notifications } = await getNotificationPlan(db);
    expect(notifications.map((n) => n.id)).toEqual(["rent:rent-jordan"]);
  });

  it("answers an empty plan before First run", async () => {
    const { db } = fakeDb([]);
    expect(await getNotificationPlan(db)).toEqual({ notifications: [] });
  });
});
