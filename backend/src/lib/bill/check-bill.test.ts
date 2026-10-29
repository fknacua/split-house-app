import { describe, expect, it } from "vitest";
import type { CheckBillRequest } from "@splithouse/shared";
import { checkBill } from "./check-bill";

// The November bill pays for October: 3 Oct to 2 Nov.
const FIELDS: CheckBillRequest = {
  currentChargesCents: 41230,
  billMonth: "2026-11",
  dueDate: "2026-11-16",
  billingPeriodStart: "2026-10-03",
  billingPeriodEnd: "2026-11-02",
  subtotalCents: null,
  lines: [],
};

const periodBlocker = (fields: Partial<CheckBillRequest>) =>
  checkBill("2026-11", { ...FIELDS, ...fields }).blockers.find((b) => b.field === "billingPeriod");

describe("checkBill: bill month", () => {
  it("has no blockers when the bill is for the month the upload started from", () => {
    expect(checkBill("2026-11", FIELDS).blockers).toEqual([]);
  });

  it("blocks a bill for another month and names both months", () => {
    expect(checkBill("2026-11", { ...FIELDS, billMonth: "2026-10" }).blockers).toEqual([
      {
        field: "billMonth",
        title: "Did you attach the wrong bill?",
        message:
          "This bill is for October 2026, but you're uploading for November 2026. If the bill is right and this was misread, edit the Bill month.",
        fieldMessage: "Invalid bill month",
      },
    ]);
  });

  it("does not block an empty or unreadable bill month (the form shows its own error)", () => {
    expect(checkBill("2026-11", { ...FIELDS, billMonth: null }).blockers).toEqual([]);
  });
});

describe("checkBill: billing period", () => {
  it("passes a period from the 3rd to the 2nd of the next month, in months of every length", () => {
    const standard = [
      ["2026-03", "2026-02-03", "2026-03-02"],
      ["2026-05", "2026-04-03", "2026-05-02"],
      ["2026-10", "2026-09-03", "2026-10-02"],
      ["2026-11", "2026-10-03", "2026-11-02"],
      ["2027-01", "2026-12-03", "2027-01-02"],
    ] as const;
    for (const [billMonth, start, end] of standard) {
      const fields = { ...FIELDS, billMonth, billingPeriodStart: start, billingPeriodEnd: end };
      expect(checkBill(billMonth, fields).blockers).toEqual([]);
    }
  });

  it("passes a whole calendar month before the bill month, and a one-day period", () => {
    expect(periodBlocker({ billingPeriodStart: "2026-10-01", billingPeriodEnd: "2026-10-31" })).toBeUndefined();
    expect(periodBlocker({ billingPeriodStart: "2026-10-03", billingPeriodEnd: "2026-10-03" })).toBeUndefined();
  });

  it("blocks a period that does not start in the month before the bill month, naming the month and the dates", () => {
    expect(periodBlocker({ billingPeriodStart: "2026-11-03", billingPeriodEnd: "2026-12-02" })).toEqual({
      field: "billingPeriod",
      title: "Check the billing period",
      message:
        "The billing period (3 Nov – 2 Dec 2026) doesn't fit a November 2026 bill. It should start in October 2026.",
      fieldMessage: "Invalid billing period",
    });
    // The bill month itself is too late, and so is two months before it.
    expect(periodBlocker({ billingPeriodStart: "2026-09-03", billingPeriodEnd: "2026-10-02" })).toBeDefined();
  });

  it("blocks a start picked in the wrong year", () => {
    const blocker = periodBlocker({ billingPeriodStart: "2027-10-03", billingPeriodEnd: "2027-11-02" });
    expect(blocker?.message).toContain("It should start in October 2026.");
  });

  it("blocks a period longer than 30 days, but allows exactly 30 days between the first and last day", () => {
    expect(periodBlocker({ billingPeriodEnd: "2026-11-02" })).toBeUndefined();
    const blocker = periodBlocker({ billingPeriodEnd: "2026-11-03" });
    expect(blocker?.fieldMessage).toBe("Invalid billing period");
    expect(blocker?.message).toContain("It should end at most 30 days after it starts.");
  });

  it("blocks a period that ends before it starts", () => {
    const blocker = periodBlocker({ billingPeriodStart: "2026-10-10", billingPeriodEnd: "2026-10-02" });
    expect(blocker?.message).toContain("It ends before it starts.");
  });

  it("does not block while the period is missing (the form shows its own errors)", () => {
    expect(periodBlocker({ billingPeriodStart: null })).toBeUndefined();
    expect(periodBlocker({ billingPeriodEnd: null })).toBeUndefined();
  });

  it("is judged against the month the upload started from, so a wrong bill month does not hide it", () => {
    // Uploading for November; the Bill month is wrongly Dec 2026 and the period is 19 Nov: both are flagged.
    const wrongBoth = { ...FIELDS, billMonth: "2026-12", billingPeriodStart: "2026-11-19", billingPeriodEnd: "2026-11-19" };
    expect(checkBill("2026-11", wrongBoth).blockers.map((b) => b.field)).toEqual(["billMonth", "billingPeriod"]);
    // An empty bill month does not hide it either.
    expect(periodBlocker({ billMonth: null, billingPeriodStart: "2026-11-19", billingPeriodEnd: "2026-11-19" })).toBeDefined();
  });

  it("does not flag a good period just because the bill month is wrong", () => {
    const fields = { ...FIELDS, billMonth: "2026-09" };
    expect(checkBill("2026-11", fields).blockers.map((b) => b.field)).toEqual(["billMonth"]);
  });
});

describe("checkBill: lines note", () => {
  it("returns the note about the lines next to the blockers, and never blocks on it", () => {
    const lines = [{ label: "Electricity", cents: 26845 }];
    const result = checkBill("2026-11", { ...FIELDS, subtotalCents: 35000, lines });
    expect(result.linesNote?.title).toBe("Lines don’t add up to the Subtotal");
    expect(result.blockers).toEqual([]);
  });
});
