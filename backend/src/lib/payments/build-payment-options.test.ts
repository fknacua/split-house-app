import { paymentOptionsResponseSchema } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS, VERSION_A_CONFIG } from "@/lib/fixtures/household";
import { buildPaymentOptions, type PaymentOptionsChargeRow, type PaymentOptionsPerson } from "./build-payment-options";

const PEOPLE: PaymentOptionsPerson[] = [
  { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", isOwner: false },
  { id: PERSON_IDS.sam, name: "Sam", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", isOwner: false },
];

const NAMES: Record<string, string> = Object.fromEntries(PEOPLE.map((p) => [p.id, p.name]));

/** An unpaid November charge for the person, due on the day given (or none). */
function charge(
  id: string,
  personId: string,
  label: string,
  amountCents: number,
  dueDate: string | null,
  extra: Partial<PaymentOptionsChargeRow> = {},
): PaymentOptionsChargeRow {
  return {
    id,
    personId,
    month: "2026-11",
    category: label === "Rent" ? "RENT" : "UTILITIES",
    label,
    amountCents,
    dueDate: dueDate ? new Date(dueDate) : null,
    payViaPersonId: null,
    paidCents: null,
    paidOn: null,
    person: { name: NAMES[personId] },
    config: NOV_2026_CONFIG,
    ...extra,
  };
}

const JORDAN_RENT = charge("jordan-rent", PERSON_IDS.jordan, "Rent", 95000, "2026-11-01");
const JORDAN_UTILITIES = charge("jordan-utilities", PERSON_IDS.jordan, "Utilities", 10079, "2026-11-04");
const PRIYA_UTILITIES = charge("priya-utilities", PERSON_IDS.priya, "Utilities", 12000, "2026-11-07");
// Sam's utilities are paid via Priya and stored with no due date of their own, so they use hers.
const SAM_UTILITIES = charge("sam-utilities", PERSON_IDS.sam, "Utilities", 8246, null, {
  payViaPersonId: PERSON_IDS.priya,
});
const SAM_RENT = charge("sam-rent", PERSON_IDS.sam, "Rent", 95000, "2026-11-28");
const JORDAN_OCT_RENT = charge("jordan-oct-rent", PERSON_IDS.jordan, "Rent", 95000, "2026-10-01", {
  month: "2026-10",
  config: VERSION_A_CONFIG,
});

const build = (charges: PaymentOptionsChargeRow[], today = "2026-11-03") =>
  buildPaymentOptions({ month: "2026-11", today, people: PEOPLE, charges });

describe("buildPaymentOptions", () => {
  it("lists each payer most urgent first, parsing with the shared schema", () => {
    const options = paymentOptionsResponseSchema.parse(
      build([SAM_RENT, PRIYA_UTILITIES, JORDAN_UTILITIES, SAM_UTILITIES, JORDAN_RENT]),
    );
    expect(options.people.map((p) => p.name)).toEqual(["Jordan", "Priya", "Sam"]);
    expect(options.people[0]).toMatchObject({
      personId: PERSON_IDS.jordan,
      detail: "2 unpaid · $1,050.79",
      charges: [{ label: "Rent · Nov" }, { label: "Utilities · Nov" }],
    });
  });

  it("puts a charge paid via someone in their list, with the owing person's name", () => {
    const priya = build([PRIYA_UTILITIES, SAM_UTILITIES]).people[0];
    expect(priya.charges.map((c) => c.label)).toEqual(["Utilities · Nov", "Utilities · Sam · Nov"]);
    expect(priya.detail).toBe("2 unpaid · $202.46");
  });

  it("gives each charge its Record payment sheet", () => {
    expect(build([JORDAN_RENT]).people[0].charges[0].sheet).toMatchObject({
      chargeId: "jordan-rent",
      title: "Record payment",
      subtitle: "Money you received for November",
      expected: "$950.00",
      due: { text: "Overdue since 1 Nov", tone: "danger" },
      amountCents: 95000,
      paidOn: "2026-11-03",
      actionLabel: "Record $950.00",
    });
  });

  it("lists earlier months' unpaid charges after the newest month's", () => {
    const jordan = build([JORDAN_OCT_RENT, JORDAN_UTILITIES]).people[0];
    expect(jordan.charges.map((c) => c.label)).toEqual(["Utilities · Nov", "Rent · Oct"]);
    expect(jordan.charges[1].sheet.subtitle).toBe("Money you received for October");
  });

  it("reads upcoming while nothing is overdue or due within 7 days", () => {
    expect(build([SAM_RENT]).people[0].detail).toBe("1 upcoming · $950.00");
    expect(build([SAM_RENT], "2026-11-21").people[0].detail).toBe("1 unpaid · $950.00");
    expect(build([charge("x", PERSON_IDS.sam, "Starhub", 2750, null)]).people[0].detail).toBe("1 upcoming · $27.50");
  });

  it("leaves out paid charges, credits, the owner's own charges and later months", () => {
    expect(
      build([
        { ...JORDAN_RENT, paidCents: 90000, paidOn: new Date("2026-11-02") },
        { ...JORDAN_UTILITIES, amountCents: -500 },
        charge("alex-rent", PERSON_IDS.alex, "Rent", 120000, "2026-11-01"),
        { ...SAM_RENT, month: "2026-12" },
      ]).people,
    ).toEqual([]);
  });
});
