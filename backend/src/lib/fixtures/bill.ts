import type { ParsedBill } from "../bill/bill-parser";

/**
 * The synthetic bill fixture: a committed generator (`generate-bill-pdf.ts`, run by
 * `scripts/generate-bill-fixture.ts`) draws {@link BILL_FIXTURE_PAGES} into a two-page PDF with
 * invented values, and these are the fields `utilBillParser` should read back out of it. Tests
 * read the PDF with `unpdf` for real. The four lines add up to the Subtotal, so this is a clean read
 * with no "Save with warnings?" triggers.
 */
export const BILL_FIXTURE: ParsedBill = {
  currentChargesCents: 38150,
  billingPeriodStart: "2026-10-03",
  billingPeriodEnd: "2026-11-02",
  billMonth: "2026-11",
  dueDate: "2026-11-16",
  subtotalCents: 35000,
  lines: [
    { label: "Electricity", cents: 21000 },
    { label: "Gas", cents: 5000 },
    { label: "Water", cents: 7000 },
    { label: "Refuse Removal", cents: 2000 },
  ],
};

/**
 * What `utilBillParser` should read from {@link BILL_FIXTURE_PARTIAL_PAGES}: the same bill, with the
 * Water amount missing on page 1, so Review bill shows "1 line not found".
 */
export const BILL_FIXTURE_PARTIAL: ParsedBill = {
  ...BILL_FIXTURE,
  lines: BILL_FIXTURE.lines.map((line) => (line.label === "Water" ? { ...line, cents: null } : line)),
};

/**
 * The lines of text drawn onto the fixture PDF, one array per page, top to bottom. Mirrors the
 * real bill's two pages. Page 1: the billing period's dates sit on the line below the "Billing
 * Period" table header, then the summary where each service's total sits a few lines below its
 * own "<Type> Services" header (the chart's text is left out), then Refuse Removal and GST. Page 2:
 * the summary of charges with the bill's own "Current Charges due on" sentence, then the breakdown
 * table, where each row ends in its total and has no `$`, and the Subtotal row comes before GST.
 * GST is printed like a real bill but is not read.
 */
export const BILL_FIXTURE_PAGES = [
  [
    "Billing Period Bill Date Account Type Deposit",
    "03 Oct 2026 - 02 Nov 2026 01 Nov 2026 Domestic $120.00",
    "November 2026 Bill",
    "Account No. 1234567890",
    "Total Amount Payable: $381.50",
    "Payment Due: 16 Nov 2026",
    "",
    "Current Charges Consumption Trend Total",
    "Usage",
    "Electricity Services",
    "Usage: 300 kWh",
    "$210.00",
    "",
    "Usage",
    "Gas Services",
    "by City Energy Pte. Ltd. (as Trustee",
    "of City Energy Trust)",
    "Usage: 50 kWh",
    "$50.00",
    "",
    "Usage",
    "Water Services",
    "by Public Utilities Board",
    "Usage: 20.5 Cu M",
    "$70.00",
    "",
    "Refuse Removal",
    "by Example Waste Pte Ltd $20.00",
    "GST $31.50",
    "Current Charges:",
    "(Inclusive of GST) $381.50",
  ],
  [
    "November 2026 Bill",
    "Account No. 1234567890",
    "Summary of Charges",
    "Balance Brought Forward from Previous Bill $300.00",
    "Payment on 06 Oct 2026 - Thank You -$300.00",
    "Outstanding Balance $0.00",
    "Current Charges due on 16 Nov 2026 (Mon) $381.50",
    "Total Amount Payable $381.50",
    "Breakdown of Current Charges Usage Rate ($) Amount ($) Total ($)",
    "Electricity Services",
    "Meter Reading taken : 1000 690 kWh 0.3000 207.00",
    "10 kWh 0.3000 3.00 210.00",
    "Gas Services by City Energy Pte. Ltd. (as Trustee of City Energy",
    "Trust)",
    "Meter Reading taken : 2000 190 kWh 0.2500 47.50",
    "10 kWh 0.2500 2.50 50.00",
    "Water Services by Public Utilities Board",
    "Meter Reading taken : 3000 20.0 Cu M 1.6000 32.00",
    "Waterborne Tax 20.0 Cu M 1.1000 22.00",
    "Water Conservation Tax $32.00 50% 16.00 70.00",
    "Refuse Removal by Example Waste Pte Ltd 1 Qty 20.00 20.00 20.00",
    "Subtotal 350.00 350.00",
    "GST $350.00 9% 31.50 31.50",
    "Current Charges:",
    "(Inclusive of GST) $381.50",
    "",
    "- Refuse removal fee for Example Waste Pte Ltd",
  ],
];

/**
 * {@link BILL_FIXTURE_PAGES} without the Water amount on page 1 (the page 2 table still has it, but
 * the parser reads the services from page 1). For device-testing the "line not found" state.
 */
export const BILL_FIXTURE_PARTIAL_PAGES = BILL_FIXTURE_PAGES.map((page) => page.filter((line) => line !== "$70.00"));

/**
 * A real PDF that is not a utilities bill: a short letter with no Current Charges, so the parser
 * reads nothing. For tests and for device-testing the "Is this the right bill?" screen.
 */
export const BILL_FIXTURE_UNREADABLE_PAGES = [
  [
    "Tenancy renewal notice",
    "Dear tenant,",
    "Your tenancy renews on 01 Jan 2027 on the same terms.",
    "No action is needed.",
  ],
];
