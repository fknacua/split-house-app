import { HOUSEHOLD_SCHEMA_VERSION } from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { getPaymentOptions, type PaymentOptionsDb } from "./payment-options.service";

const PEOPLE = [
  { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
  { id: PERSON_IDS.jordan, name: "Jordan", isOwner: false },
];

const JORDAN_RENT = {
  id: "jordan-rent",
  personId: PERSON_IDS.jordan,
  month: "2026-11",
  category: "RENT" as const,
  label: "Rent",
  amountCents: 95000,
  dueDate: new Date("2026-11-01"),
  payViaPersonId: null,
  paidCents: null,
  paidOn: null,
  person: { name: "Jordan" },
  householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
};

/** A database with November open (or no month) and Jordan's rent unpaid; records the charge query. */
function fakeDb(open: boolean) {
  const queries: unknown[] = [];
  const db: PaymentOptionsDb = {
    month: { findUnique: async () => (open ? { month: "2026-11" } : null) },
    person: { findMany: async () => PEOPLE },
    charge: {
      findMany: async (args) => {
        queries.push(args.where);
        return [JORDAN_RENT];
      },
    },
  };
  return { db, queries };
}

describe("getPaymentOptions", () => {
  beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00"));
  afterEach(() => vi.unstubAllEnvs());

  it("reads unpaid charges above zero up to the month, with today in Singapore", async () => {
    const { db, queries } = fakeDb(true);
    const options = await getPaymentOptions(db, "2026-11");
    expect(queries).toEqual([{ month: { lte: "2026-11" }, paidCents: null, amountCents: { gt: 0 } }]);
    expect(options.people[0]).toMatchObject({
      name: "Jordan",
      charges: [{ label: "Rent · Nov", sheet: { paidOn: "2026-11-03", due: { text: "Overdue since 1 Nov" } } }],
    });
  });

  it("answers 404 no_month when the month is not open", async () => {
    await expect(getPaymentOptions(fakeDb(false).db, "2026-12")).rejects.toMatchObject({
      status: 404,
      code: "no_month",
    });
  });
});
