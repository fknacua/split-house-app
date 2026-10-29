import {
  REFUSE_REMOVAL_LABEL,
  UTIL_BILL_LINE_LABELS,
  parseDisplayDate,
  parseDisplayMonth,
  parseMoneyToCents,
} from "@splithouse/shared";
import type { BillParser, ParsedBill, ParsedBillLine } from "./bill-parser";

const DATE = /(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})/;

function findAmountAfterLabel(text: string, label: string): number | null {
  const regex = new RegExp(`${label}(?:\\s*\\([^)]*\\))?[^$\\n\\d]{0,60}\\$?\\s*(\\d[\\d,]*\\.\\d{2})`, "i");
  const match = regex.exec(text);
  return match ? parseMoneyToCents(match[1]) : null;
}

function findDateAfterLabel(text: string, label: string): string | null {
  const regex = new RegExp(`${label}[^\\n\\d]{0,40}${DATE.source}`, "i");
  const match = regex.exec(text);
  return match ? parseDisplayDate(match[1]) : null;
}

/**
 * Matches the bill's own sentence, e.g. `Current Charges due on 16 Oct 2026 (Fri) $412.30`,
 * which gives the amount and the due date together. `findAmountAfterLabel` alone can't read
 * this: the due date sits between the label and the `$`, which it treats as a non-match.
 */
const CURRENT_CHARGES_DUE_ON = new RegExp(
  `Current\\s+Charges\\s+due\\s+on\\s+${DATE.source}\\s*\\([^)]*\\)\\s*\\$?\\s*(\\d[\\d,]*\\.\\d{2})`,
  "i",
);

function findCurrentCharges(text: string): { cents: number; dueDate: string | null } | null {
  const match = CURRENT_CHARGES_DUE_ON.exec(text);
  const centsFromSentence = match ? parseMoneyToCents(match[2]) : null;
  if (match && centsFromSentence !== null) {
    return { cents: centsFromSentence, dueDate: parseDisplayDate(match[1]) };
  }

  const cents = findAmountAfterLabel(text, "Current\\s+Charges");
  return cents === null ? null : { cents, dueDate: null };
}

/**
 * A utility's amount sits a few lines below its `<Label> Services` header, after a `Usage:
 * ...` line (and sometimes a `by <company>` line) — never on the header's own line, so
 * `findAmountAfterLabel` can't read it.
 */
function findLines(text: string): ParsedBillLine[] {
  const textLines = text.split("\n");
  const result: ParsedBillLine[] = [];
  for (const label of UTIL_BILL_LINE_LABELS) {
    const headerIndex = textLines.findIndex((line) => new RegExp(`^${label}\\s+Services`, "i").test(line.trim()));
    if (headerIndex === -1) continue;

    for (let i = headerIndex + 1; i < Math.min(textLines.length, headerIndex + 8); i++) {
      const match = /\$(\d[\d,]*\.\d{2})/.exec(textLines[i]);
      if (!match) continue;
      const cents = parseMoneyToCents(match[1]);
      if (cents !== null) result.push({ label, cents });
      break;
    }
  }
  return result;
}

/**
 * The amount at the end of the breakdown table row that starts with `label` (a regex source), e.g.
 * `Subtotal 350.00 350.00`: the table's last column is the row's total. The row has to start the
 * line and end in an amount, so the same words elsewhere (the page 1 heading that has its amount
 * on the next line, a footnote) are not read. Amounts in this table have no `$`.
 */
function findTableRowTotal(text: string, label: string): number | null {
  const regex = new RegExp(`^${label}\\b[^\\n]*[ \\t]\\$?(\\d[\\d,]*\\.\\d{2})[ \\t\\r]*$`, "im");
  const match = regex.exec(text);
  return match ? parseMoneyToCents(match[1]) : null;
}

/** The refuse removal charge: the breakdown table's one-line row, read after the services. */
function findRefuseRemoval(text: string): ParsedBillLine[] {
  const cents = findTableRowTotal(text, "Refuse[ \\t]+Removal");
  return cents === null ? [] : [{ label: REFUSE_REMOVAL_LABEL, cents }];
}

/**
 * The two billing-period dates sit on the line after the `Billing Period` table header, not
 * next to the label itself, followed by the bill date, account type and deposit columns.
 */
function findBillingPeriod(text: string): { start: string | null; end: string | null } {
  const textLines = text.split("\n");
  const headerIndex = textLines.findIndex((line) => /Billing\s+Period/i.test(line));
  if (headerIndex === -1 || headerIndex + 1 >= textLines.length) return { start: null, end: null };

  const regex = new RegExp(`^\\s*${DATE.source}\\s*-\\s*${DATE.source}`);
  const match = regex.exec(textLines[headerIndex + 1]);
  if (!match) return { start: null, end: null };
  return { start: parseDisplayDate(match[1]), end: parseDisplayDate(match[2]) };
}

/**
 * The bill prints its own month as a standalone heading, e.g. `October 2026 Bill`, separate
 * from the billing period.
 */
function findBillMonth(text: string): string | null {
  const match = /^\s*([A-Za-z]+\s+\d{4})\s+Bill\s*$/im.exec(text);
  return match ? parseDisplayMonth(match[1]) : null;
}

/** Reads the household's combined electricity, water and gas bill layout. */
export const utilBillParser: BillParser = {
  parse(text: string): ParsedBill | null {
    const currentCharges = findCurrentCharges(text);
    if (currentCharges === null) return null;

    const period = findBillingPeriod(text);
    const dueDate = currentCharges.dueDate ?? findDateAfterLabel(text, "(?:Payment\\s+)?Due(?:\\s+Date)?");

    return {
      currentChargesCents: currentCharges.cents,
      billingPeriodStart: period.start,
      billingPeriodEnd: period.end,
      billMonth: findBillMonth(text),
      dueDate,
      subtotalCents: findTableRowTotal(text, "Subtotal"),
      lines: [...findLines(text), ...findRefuseRemoval(text)],
    };
  },
};
