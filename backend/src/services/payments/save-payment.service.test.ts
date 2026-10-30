import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PERSON_IDS } from "@/lib/fixtures/household";
import { savePayment, type SavePaymentDb } from "./save-payment.service";

interface FakeCharge {
  month: string;
  personId: string;
  payViaPersonId: string | null;
  amountCents: number;
  paidCents: number | null;
}

const JORDAN_RENT: FakeCharge = {
  month: "2026-11",
  personId: PERSON_IDS.jordan,
  payViaPersonId: null,
  amountCents: 95000,
  paidCents: null,
};

/** A database with November as the newest opened month and one charge, or none; records the updates it gets. */
function fakeDb(charge: FakeCharge | null) {
  const updates: unknown[] = [];
  const db: SavePaymentDb = {
    month: { findFirst: async () => ({ month: "2026-11" }) },
    charge: {
      findUnique: async () => charge,
      updateMany: async (args) => {
        updates.push(args);
        const matches = charge !== null && (args.where.paidCents !== null || charge.paidCents === null);
        return { count: matches ? 1 : 0 };
      },
    },
  };
  return { db, updates };
}

const PAYMENT = { paidCents: 95000, paidOn: "2026-11-03" };

describe("savePayment", () => {
  beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00"));
  afterEach(() => vi.unstubAllEnvs());

  it("stores the amount, the day and the person as the payer", async () => {
    const { db, updates } = fakeDb(JORDAN_RENT);
    expect(await savePayment(db, "charge-1", PAYMENT)).toEqual({ chargeId: "charge-1", month: "2026-11" });
    expect(updates).toEqual([
      {
        where: { id: "charge-1" },
        data: { paidCents: 95000, paidOn: new Date("2026-11-03"), paidByPersonId: PERSON_IDS.jordan },
      },
    ]);
  });

  it("records a charge paid via someone as paid by them", async () => {
    const { db, updates } = fakeDb({ ...JORDAN_RENT, personId: PERSON_IDS.sam, payViaPersonId: PERSON_IDS.priya });
    await savePayment(db, "charge-1", PAYMENT);
    expect(updates).toMatchObject([{ data: { paidByPersonId: PERSON_IDS.priya } }]);
  });

  it("stores a short payment as received", async () => {
    const { db, updates } = fakeDb(JORDAN_RENT);
    await savePayment(db, "charge-1", { paidCents: 90000, paidOn: "2026-11-02" });
    expect(updates).toMatchObject([{ data: { paidCents: 90000, paidOn: new Date("2026-11-02") } }]);
  });

  it("replaces a stored payment in the current month", async () => {
    const { db, updates } = fakeDb({ ...JORDAN_RENT, paidCents: 90000 });
    await savePayment(db, "charge-1", PAYMENT);
    expect(updates).toMatchObject([{ where: { id: "charge-1" }, data: { paidCents: 95000 } }]);
  });

  it("records a late first payment in an earlier month, only while it is unpaid", async () => {
    const { db, updates } = fakeDb({ ...JORDAN_RENT, month: "2026-10" });
    expect(await savePayment(db, "charge-1", PAYMENT)).toEqual({ chargeId: "charge-1", month: "2026-10" });
    expect(updates).toMatchObject([{ where: { id: "charge-1", paidCents: null } }]);
  });

  it("answers 409 payment_locked when changing a stored payment in an earlier month", async () => {
    const { db } = fakeDb({ ...JORDAN_RENT, month: "2026-10", paidCents: 95000 });
    await expect(savePayment(db, "charge-1", PAYMENT)).rejects.toMatchObject({ status: 409, code: "payment_locked" });
  });

  it("answers 400 for a day after today", async () => {
    await expect(
      savePayment(fakeDb(JORDAN_RENT).db, "charge-1", { paidCents: 95000, paidOn: "2026-11-04" }),
    ).rejects.toMatchObject({ status: 400, code: "invalid_request" });
  });

  it("answers 404 no_charge for an unknown charge", async () => {
    await expect(savePayment(fakeDb(null).db, "nope", PAYMENT)).rejects.toMatchObject({ status: 404, code: "no_charge" });
  });

  it("answers 409 nothing_to_pay for a credit", async () => {
    await expect(
      savePayment(fakeDb({ ...JORDAN_RENT, amountCents: -5000 }).db, "charge-1", PAYMENT),
    ).rejects.toMatchObject({ status: 409, code: "nothing_to_pay" });
  });
});
