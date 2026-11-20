import { recordPaymentSheetSchema } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS, VERSION_A_CONFIG } from "@/lib/fixtures/household";
import {
  buildRecordPayment,
  payablesByPayer,
  type RecordPaymentCharge,
  type RecordPaymentPerson,
  type RecordPaymentSelection,
} from "./build-record-payment";

const { alex, priya, sam, jordan } = PERSON_IDS;

const PEOPLE: RecordPaymentPerson[] = [
  { id: alex, name: "Alex", isOwner: true },
  { id: priya, name: "Priya", isOwner: false },
  { id: sam, name: "Sam", isOwner: false },
  { id: jordan, name: "Jordan", isOwner: false },
];

/** An unpaid November charge for the person, due on the day given (or none). */
function charge(
  id: string,
  personId: string,
  label: string,
  amountCents: number,
  dueDate: string | null,
  extra: Partial<RecordPaymentCharge> = {},
): RecordPaymentCharge {
  return {
    id,
    personId,
    month: "2026-11",
    category: label === "Rent" ? "RENT" : label === "Aircon" ? "AIRCON" : "UTILITIES",
    label,
    amountCents,
    dueDate: dueDate ? new Date(`${dueDate}T00:00:00+08:00`) : null,
    payViaPersonId: null,
    paidCents: null,
    config: NOV_2026_CONFIG,
    ...extra,
  };
}

const JORDAN_RENT = charge("jordan-rent", jordan, "Rent", 95000, "2026-11-01");
const JORDAN_UTILITIES = charge("jordan-utilities", jordan, "Utilities", 8246, "2026-11-04");
const JORDAN_AIRCON = charge("jordan-aircon", jordan, "Aircon", 1833, "2026-11-04");
const PRIYA_RENT = charge("priya-rent", priya, "Rent", 167500, "2026-11-07");
// Sam's utilities are collected through Priya and stored with no due date, so they use hers.
const SAM_UTILITIES = charge("sam-utilities", sam, "Utilities", 8246, null, { payViaPersonId: priya });
const SAM_RENT = charge("sam-rent", sam, "Rent", 95000, "2026-11-28");
const ALEX_RENT = charge("alex-rent", alex, "Rent", 167500, "2026-11-01");
const JORDAN_OCT_RENT = charge("jordan-oct-rent", jordan, "Rent", 95000, "2026-10-01", {
  month: "2026-10",
  config: VERSION_A_CONFIG,
});
const ALL = [SAM_RENT, PRIYA_RENT, SAM_UTILITIES, JORDAN_AIRCON, JORDAN_UTILITIES, JORDAN_RENT, ALEX_RENT];

const NOBODY: RecordPaymentSelection = { personId: null, ticked: [] };

const build = (selection: RecordPaymentSelection, charges = ALL, today = "2026-11-03") =>
  recordPaymentSheetSchema.parse(buildRecordPayment({ month: "2026-11", today, people: PEOPLE, charges }, selection));

describe("buildRecordPayment", () => {
  it("opens with nobody picked: the From list most urgent first, For waiting for a person", () => {
    const sheet = build(NOBODY);
    expect(sheet).toMatchObject({
      month: "2026-11",
      title: "Record payment",
      subtitle: "Nov 2026",
      settled: null,
      from: { personId: null, placeholder: "Select person" },
      for: { empty: "Select a person first", count: null, rows: [] },
      amount: { value: "$0.00", expected: null, note: null },
      paidOn: "2026-11-03",
      record: { label: "Record payment", request: null },
      confirm: null,
    });
    expect(sheet.from.options).toEqual([
      { personId: jordan, name: "Jordan", detail: "3 unpaid · $1,050.79", tone: "danger" },
      { personId: priya, name: "Priya", detail: "2 unpaid · $1,757.46", tone: "default" },
      { personId: sam, name: "Sam", detail: "1 upcoming · $950.00", tone: "default" },
    ]);
  });

  it("lists a collected charge under the person who collects it, never its own person, and never the owner", () => {
    const byPayer = payablesByPayer({ month: "2026-11", today: "2026-11-03", people: PEOPLE, charges: ALL });
    expect(byPayer.get(priya)?.map((p) => p.title)).toEqual(["Rent · Nov", "Utilities · Sam · Nov"]);
    expect(byPayer.get(sam)?.map((p) => p.title)).toEqual(["Rent · Nov"]);
    expect(byPayer.has(alex)).toBe(false);
  });

  it("leaves out paid charges, credits and later months", () => {
    const sheet = build(NOBODY, [
      charge("paid", jordan, "Rent", 95000, "2026-11-01", { paidCents: 95000 }),
      charge("credit", sam, "Utilities", -500, "2026-11-04"),
      charge("dec", priya, "Rent", 167500, "2026-12-07", { month: "2026-12" }),
    ]);
    expect(sheet.from.options).toEqual([]);
  });

  it("shows a picked person's For list with each chip and nothing ticked", () => {
    const sheet = build({ personId: jordan, ticked: [] }, [...ALL, JORDAN_OCT_RENT]);
    expect(sheet.from.personId).toBe(jordan);
    expect(sheet.for).toEqual({
      empty: null,
      count: "0 of 4 selected",
      rows: [
        { chargeId: "jordan-rent", title: "Rent · Nov", amount: "$950.00", detail: "Due 1 Nov", chip: { label: "Overdue 2 days", tone: "danger" }, ticked: false },
        { chargeId: "jordan-aircon", title: "Aircon · Nov", amount: "$18.33", detail: "Due 4 Nov", chip: { label: "Due tomorrow", tone: "info" }, ticked: false },
        { chargeId: "jordan-utilities", title: "Utilities · Nov", amount: "$82.46", detail: "Due 4 Nov", chip: { label: "Due tomorrow", tone: "info" }, ticked: false },
        // An earlier month's charge comes after the active month's.
        { chargeId: "jordan-oct-rent", title: "Rent · Oct", amount: "$950.00", detail: "Due 1 Oct", chip: { label: "Overdue 33 days", tone: "danger" }, ticked: false },
      ],
    });
    expect(sheet.amount).toEqual({ value: "$0.00", expected: "Expected $0.00 · 0 charges", note: null });
    expect(sheet.record).toEqual({ label: "Record payment", request: null });
    expect(sheet.confirm).toBeNull();
  });

  it("counts every day down, and reads Upcoming without a due date", () => {
    const rows = build({ personId: priya, ticked: [] }, [PRIYA_RENT, charge("priya-misc", priya, "Misc", 1000, null)]).for.rows;
    expect(rows.map((r) => [r.detail, r.chip.label])).toEqual([
      ["Due 7 Nov", "Due in 4 days"],
      [null, "Upcoming"],
    ]);
  });

  it("with one charge ticked: its amount, the expected line, and a one-charge confirm", () => {
    const sheet = build({ personId: jordan, ticked: ["jordan-rent"] });
    expect(sheet.for.count).toBe("1 of 3 selected");
    expect(sheet.amount).toEqual({ value: "$950.00", expected: "Expected $950.00 · 1 charge", note: null });
    expect(sheet.record).toEqual({ label: "Record $950.00", request: { personId: jordan, chargeIds: ["jordan-rent"] } });
    expect(sheet.confirm).toEqual({
      title: "Record this payment?",
      body: "Check the details before recording.",
      from: { label: "From", value: "Jordan" },
      for: { label: "For", value: "Rent · Nov", items: null },
      amount: { label: "Amount received", value: "$950.00" },
      receivedOnLabel: "Received on",
      confirmLabel: "Record $950.00",
      cancelLabel: "Go back",
    });
  });

  it("with several ticked: the total, the paid-in-full note, and For expanding to each charge", () => {
    const sheet = build({ personId: jordan, ticked: ["jordan-utilities", "jordan-rent", "jordan-aircon"] });
    expect(sheet.for.count).toBe("3 of 3 selected");
    expect(sheet.amount).toEqual({
      value: "$1,050.79",
      expected: "Expected $1,050.79 · 3 charges",
      note: "Multiple charges can only be paid in full",
    });
    // In the list's order, not the order they were ticked.
    expect(sheet.record.request?.chargeIds).toEqual(["jordan-rent", "jordan-aircon", "jordan-utilities"]);
    expect(sheet.confirm?.for).toEqual({
      label: "For",
      value: "3 charges",
      items: [
        { label: "Rent · Nov", value: "$950.00" },
        { label: "Aircon · Nov", value: "$18.33" },
        { label: "Utilities · Nov", value: "$82.46" },
      ],
    });
    expect(sheet.confirm?.confirmLabel).toBe("Record $1,050.79");
  });

  it("leaves out ticked ids that aren't in the person's list, such as a charge collected elsewhere", () => {
    const sheet = build({ personId: sam, ticked: ["sam-utilities", "jordan-rent"] });
    expect(sheet.for.rows.map((r) => r.chargeId)).toEqual(["sam-rent"]);
    expect(sheet.record.request).toBeNull();
  });

  it("treats someone not in the From list as nobody picked", () => {
    expect(build({ personId: alex, ticked: ["alex-rent"] }).from.personId).toBeNull();
  });

  it("shows Everyone has paid when nothing is left to record", () => {
    const sheet = build({ personId: jordan, ticked: ["jordan-rent"] }, [ALEX_RENT]);
    expect(sheet).toMatchObject({
      settled: { title: "Everyone has paid", text: "No payments left to record" },
      from: { personId: null, placeholder: "Everyone has paid", options: [] },
      for: { empty: "No unpaid charges", count: null, rows: [] },
      record: { label: "Record payment", request: null },
      confirm: null,
    });
  });
});
