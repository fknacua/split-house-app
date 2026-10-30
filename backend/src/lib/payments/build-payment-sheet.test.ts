import { chargePaymentResponseSchema } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { buildPaymentSheet, type PaymentSheetChargeRow } from "./build-payment-sheet";

// Jordan's November rent, due 1 Nov, and Sam's utilities, paid via Priya with no due date of its own.
const JORDAN_RENT: PaymentSheetChargeRow = {
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

const SAM_UTILITIES: PaymentSheetChargeRow = {
  id: "charge-sam-utilities",
  month: "2026-11",
  category: "UTILITIES",
  label: "Utilities",
  amountCents: 8246,
  dueDate: null,
  payViaPersonId: PERSON_IDS.priya,
  paidCents: null,
  paidOn: null,
  person: { name: "Sam" },
};

const build = (charge: PaymentSheetChargeRow, today = "2026-11-03") =>
  buildPaymentSheet({ today, config: NOV_2026_CONFIG, charge });

describe("buildPaymentSheet", () => {
  it("fills an unpaid charge with its expected amount and today, parsing with the shared schema", () => {
    expect(chargePaymentResponseSchema.parse(build({ ...JORDAN_RENT, dueDate: new Date("2026-11-07") }))).toEqual({
      chargeId: "charge-jordan-rent",
      month: "2026-11",
      title: "Mark paid",
      subtitle: "Rent · Jordan · November",
      expected: "$950.00",
      expectedCents: 95000,
      due: { text: "7 Nov", tone: "default" },
      amountCents: 95000,
      paidOn: "2026-11-03",
      actionLabel: "Mark as paid",
    });
  });

  it("shows an unpaid charge past its due date as overdue since that day", () => {
    expect(build(JORDAN_RENT).due).toEqual({ text: "Overdue since 1 Nov", tone: "danger" });
  });

  it("is not overdue on the due day itself", () => {
    expect(build(JORDAN_RENT, "2026-11-01").due).toEqual({ text: "1 Nov", tone: "default" });
  });

  it("uses the payer's due day for a via charge stored without one", () => {
    expect(build(SAM_UTILITIES).due).toEqual({ text: "7 Nov", tone: "default" });
  });

  it("has no Due row when no due date is known", () => {
    expect(build({ ...JORDAN_RENT, category: "RECURRING", dueDate: null }).due).toBeNull();
  });

  it("fills a paid charge with the stored amount and day, and is no longer overdue", () => {
    const sheet = build({ ...JORDAN_RENT, paidCents: 90000, paidOn: new Date("2026-11-02") });
    expect(sheet).toMatchObject({
      expected: "$950.00",
      amountCents: 90000,
      paidOn: "2026-11-02",
      due: { text: "1 Nov", tone: "default" },
    });
  });

  it("names the charge's own month, so a late payment reads October", () => {
    expect(build({ ...JORDAN_RENT, month: "2026-10", dueDate: new Date("2026-10-01") }).subtitle).toBe(
      "Rent · Jordan · October",
    );
  });

  it("words Record payment by the charge's month, with the amount on the button", () => {
    expect(buildPaymentSheet({ today: "2026-11-03", config: NOV_2026_CONFIG, charge: JORDAN_RENT, mode: "record" })).toMatchObject({
      title: "Record payment",
      subtitle: "Money you received for November",
      actionLabel: "Record $950.00",
      expected: "$950.00",
      due: { text: "Overdue since 1 Nov", tone: "danger" },
    });
    const late = { ...JORDAN_RENT, month: "2026-10", dueDate: new Date("2026-10-01") };
    expect(buildPaymentSheet({ today: "2026-11-03", config: NOV_2026_CONFIG, charge: late, mode: "record" }).subtitle).toBe(
      "Money you received for October",
    );
  });
});
