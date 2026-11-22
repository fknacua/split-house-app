import { describe, expect, it } from "vitest";
import { editPaymentSheetSchema } from "@splithouse/shared";
import { PERSON_IDS } from "@/lib/fixtures/household";
import { buildEditPayment, isPaymentEditable, type EditPaymentCharge } from "./build-edit-payment";

const NAMES = new Map([
  [PERSON_IDS.alex, "Alex"],
  [PERSON_IDS.priya, "Priya"],
  [PERSON_IDS.sam, "Sam"],
  [PERSON_IDS.jordan, "Jordan"],
]);

const JORDAN_RENT: EditPaymentCharge = {
  id: "jordan-rent",
  month: "2026-11",
  personId: PERSON_IDS.jordan,
  payViaPersonId: null,
  label: "Rent",
  amountCents: 95000,
  paidCents: 95000,
  paidOn: new Date("2026-11-03"),
  paidByPersonId: PERSON_IDS.jordan,
};

const SAM_UTILITIES: EditPaymentCharge = {
  ...JORDAN_RENT,
  id: "sam-utilities",
  personId: PERSON_IDS.sam,
  payViaPersonId: PERSON_IDS.priya,
  label: "Utilities",
  amountCents: 8246,
  paidCents: 8246,
  paidOn: new Date("2026-11-07"),
  paidByPersonId: PERSON_IDS.priya,
};

const build = (charge: EditPaymentCharge) => editPaymentSheetSchema.parse(buildEditPayment(charge, NAMES, "2026-11-21"));

describe("buildEditPayment", () => {
  it("builds the sheet as the board draws it", () => {
    expect(build(JORDAN_RENT)).toEqual({
      chargeId: "jordan-rent",
      month: "2026-11",
      title: "Edit payment",
      subtitle: "Nov 2026",
      rows: [
        { label: "From", value: "Jordan" },
        { label: "For", value: "Rent · Nov 2026" },
        { label: "Amount received", value: "$950.00" },
      ],
      paidOn: "2026-11-03",
      remove: {
        label: "Remove payment",
        confirm: {
          title: "Remove this payment?",
          body: "Rent · Jordan will show as unpaid again.",
          confirmLabel: "Remove",
          cancelLabel: "Keep",
        },
      },
    });
  });

  it("names the person in For when the charge was collected through the payer", () => {
    const sheet = build(SAM_UTILITIES);
    expect(sheet.rows.slice(0, 2)).toEqual([
      { label: "From", value: "Priya" },
      { label: "For", value: "Utilities · Sam · Nov 2026" },
    ]);
    expect(sheet.remove.confirm.body).toBe("Utilities · Sam will show as unpaid again.");
  });

  it("falls back to the route for From when no payer was stored", () => {
    expect(build({ ...SAM_UTILITIES, paidByPersonId: null }).rows[0]).toEqual({ label: "From", value: "Priya" });
  });

  it("shows a past month's payment with that month", () => {
    const oct = { ...JORDAN_RENT, month: "2026-10", paidOn: new Date("2026-10-29") };
    const sheet = build(oct);
    expect(sheet.subtitle).toBe("Oct 2026");
    expect(sheet.rows[1].value).toBe("Rent · Oct 2026");
    expect(sheet.paidOn).toBe("2026-10-29");
  });
});

describe("isPaymentEditable", () => {
  it.each([
    ["a paid charge", { amountCents: 95000, paidCents: 95000 }, false, true],
    ["an unpaid charge", { amountCents: 95000, paidCents: null }, false, false],
    ["the owner's own charge", { amountCents: 95000, paidCents: 95000 }, true, false],
    ["a paid refund", { amountCents: -500, paidCents: -500 }, false, false],
  ])("%s", (_name, charge, isOwner, expected) => {
    expect(isPaymentEditable(charge, isOwner)).toBe(expected);
  });
});
