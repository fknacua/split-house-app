import { HOUSEHOLD_SCHEMA_VERSION } from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOV_2026_CONFIG } from "@/lib/fixtures/household";
import { buildPaymentSheet, type PaymentSheetChargeRow } from "@/lib/payments/build-payment-sheet";
import { getChargePayment, type ChargePaymentDb } from "./charge-payment.service";

const RENT: PaymentSheetChargeRow = {
  id: "charge-jordan-rent",
  month: "2026-11",
  category: "RENT",
  label: "Rent",
  amountCents: 95000,
  dueDate: new Date("2026-11-01"),
  payViaPersonId: null,
  paidCents: null,
  paidOn: null,
  person: { name: "Jordan" },
};

/** A database holding one charge, or none; records the queries it gets. */
function fakeDb(charge: PaymentSheetChargeRow | null) {
  const queries: unknown[] = [];
  const db: ChargePaymentDb = {
    charge: {
      findUnique: async (args) => {
        queries.push(args);
        return charge && { ...charge, householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG } };
      },
    },
  };
  return { db, queries };
}

describe("getChargePayment", () => {
  beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00"));
  afterEach(() => vi.unstubAllEnvs());

  it("passes the charge and its pinned config to the builder, with today in Singapore", async () => {
    const { db, queries } = fakeDb(RENT);
    expect(await getChargePayment(db, "charge-jordan-rent")).toEqual(
      buildPaymentSheet({ today: "2026-11-03", config: NOV_2026_CONFIG, charge: RENT }),
    );
    expect(queries).toMatchObject([{ where: { id: "charge-jordan-rent" } }]);
  });

  it("answers 404 no_charge for an unknown charge", async () => {
    await expect(getChargePayment(fakeDb(null).db, "nope")).rejects.toMatchObject({ status: 404, code: "no_charge" });
  });

  it("answers 409 nothing_to_pay for a credit", async () => {
    await expect(getChargePayment(fakeDb({ ...RENT, amountCents: -5000 }).db, RENT.id)).rejects.toMatchObject({
      status: 409,
      code: "nothing_to_pay",
    });
  });
});
