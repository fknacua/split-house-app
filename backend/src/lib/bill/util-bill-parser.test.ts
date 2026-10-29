import { describe, expect, it } from "vitest";
import { parseBillText } from "./bill-parser";
import { utilBillParser } from "./util-bill-parser";

// Mirrors the real bill's layout: table headers and their values sit on separate lines,
// and each utility's amount sits a few lines below its own "<Type> Services" header.
const SAMPLE_BILL_TEXT = `
November 2026 Bill
Tax Invoice
Account Number: 1234567890
Billing Period Bill Date Account Type Deposit
01 Oct 2026 - 31 Oct 2026 01 Nov 2026 Domestic $120.00

Current Charges Consumption Trend Total
Usage
Electricity Services
Usage: 300 kWh
$281.50

Usage
Gas Services
by City Energy Pte. Ltd. (as Trustee
of City Energy Trust)
Usage: 50 kWh
$18.90

Usage
Water Services
by Public Utilities Board
Usage: 20.5 Cu M
$98.40

Current Charges due on 16 Nov 2026 (Mon) $412.30
Total Amount Payable $412.30
`;

describe("utilBillParser", () => {
  it("reads current charges, billing period, due date and the best-effort lines", () => {
    const parsed = utilBillParser.parse(SAMPLE_BILL_TEXT);
    expect(parsed).toEqual({
      currentChargesCents: 41230,
      billingPeriodStart: "2026-10-01",
      billingPeriodEnd: "2026-10-31",
      billMonth: "2026-11",
      dueDate: "2026-11-16",
      subtotalCents: null,
      lines: [
        { label: "Electricity", cents: 28150 },
        { label: "Gas", cents: 1890 },
        { label: "Water", cents: 9840 },
      ],
    });
  });

  it("reads the bill month from its own heading, e.g. 'October 2026 Bill'", () => {
    const text = "October 2026 Bill\nCurrent Charges $100.00";
    expect(utilBillParser.parse(text)?.billMonth).toBe("2026-10");
  });

  it("leaves bill month null when there is no such heading", () => {
    const text = "Current Charges $100.00";
    expect(utilBillParser.parse(text)?.billMonth).toBeNull();
  });

  it("returns null when Current Charges can't be found, even with other fields present", () => {
    const text = SAMPLE_BILL_TEXT.replace("Current Charges due on 16 Nov 2026 (Mon) $412.30", "");
    expect(utilBillParser.parse(text)).toBeNull();
  });

  it("returns null on text with no bill fields at all", () => {
    expect(utilBillParser.parse("this is not a bill")).toBeNull();
  });

  it("still reads Current Charges when the billing period and due date are missing", () => {
    const text = "Current Charges $100.00";
    expect(utilBillParser.parse(text)).toEqual({
      currentChargesCents: 10000,
      billingPeriodStart: null,
      billingPeriodEnd: null,
      billMonth: null,
      dueDate: null,
      subtotalCents: null,
      lines: [],
    });
  });

  it("only picks up lines that are actually present", () => {
    const text = "Current Charges $50.00\nElectricity Services\nUsage: 10 kWh\n$50.00";
    const parsed = utilBillParser.parse(text);
    expect(parsed?.lines).toEqual([{ label: "Electricity", cents: 5000 }]);
  });

  it("reads Current Charges and the due date from the bill's own 'due on' sentence, with a date in between", () => {
    // Real bills write this as one sentence, not a label immediately followed by the amount:
    // the due date sits between "Current Charges" and the "$" amount.
    const text = "Current Charges due on 16 Oct 2026 (Fri) $412.30";
    const parsed = utilBillParser.parse(text);
    expect(parsed?.currentChargesCents).toBe(41230);
    expect(parsed?.dueDate).toBe("2026-10-16");
  });

  it("reads a due date written as 'Payment Due:' with no 'Date' word", () => {
    const text = "Current Charges $100.00\nPayment Due: 25 Nov 2026";
    expect(utilBillParser.parse(text)?.dueDate).toBe("2026-11-25");
  });
});

// The breakdown table on the bill's second page: every row ends in its total, with no `$`.
const BREAKDOWN_TEXT = `
Current Charges due on 16 Nov 2026 (Mon) $381.50
Breakdown of Current Charges Usage Rate ($) Amount ($) Total ($)
Refuse Removal by Example Waste Pte Ltd 1 Qty 20.00 20.00 20.00
Subtotal 350.00 350.00
GST $350.00 9% 31.50 31.50
Current Charges:
(Inclusive of GST) $381.50
`;

describe("utilBillParser: Refuse Removal and Subtotal", () => {
  it("reads the Refuse Removal line and the Subtotal from the breakdown table", () => {
    const parsed = utilBillParser.parse(BREAKDOWN_TEXT);
    expect(parsed?.subtotalCents).toBe(35000);
    expect(parsed?.lines).toEqual([{ label: "Refuse Removal", cents: 2000 }]);
  });

  it("puts Refuse Removal after the services", () => {
    const text = `${SAMPLE_BILL_TEXT}${BREAKDOWN_TEXT}`;
    expect(utilBillParser.parse(text)?.lines.map((line) => line.label)).toEqual([
      "Electricity",
      "Gas",
      "Water",
      "Refuse Removal",
    ]);
  });

  it("reads the total column when the row has a quantity and more amounts", () => {
    const text = `${BREAKDOWN_TEXT}Refuse Removal by Another Waste Pte Ltd 2 Qty 9.45 18.90 18.90`;
    expect(utilBillParser.parse(text)?.lines).toEqual([{ label: "Refuse Removal", cents: 2000 }]);
    expect(utilBillParser.parse(text.replace(/Refuse Removal by Example[^\n]*\n/, ""))?.lines).toEqual([
      { label: "Refuse Removal", cents: 1890 },
    ]);
  });

  it("reads a total with a thousands separator", () => {
    expect(utilBillParser.parse("Current Charges $100.00\nSubtotal 1,350.00 1,350.00")?.subtotalCents).toBe(135000);
  });

  it("does not read the page 1 heading, whose amount is on the next line, or a footnote", () => {
    const text = [
      "Current Charges $100.00",
      "Refuse Removal",
      "by Example Waste Pte Ltd $20.00",
      "- Refuse removal fee for Example Waste Pte Ltd",
      "Subtotals are shown before GST",
    ].join("\n");
    const parsed = utilBillParser.parse(text);
    expect(parsed?.lines).toEqual([]);
    expect(parsed?.subtotalCents).toBeNull();
  });

  it("leaves them out when the bill has no such rows", () => {
    const parsed = utilBillParser.parse("Current Charges $100.00");
    expect(parsed?.subtotalCents).toBeNull();
    expect(parsed?.lines).toEqual([]);
  });
});

describe("parseBillText", () => {
  it("tries each parser and returns the first successful read", () => {
    const parsed = parseBillText(SAMPLE_BILL_TEXT, [utilBillParser]);
    expect(parsed?.currentChargesCents).toBe(41230);
  });

  it("returns null when no parser can read the bill", () => {
    expect(parseBillText("not a bill", [utilBillParser])).toBeNull();
  });
});
