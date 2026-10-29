import {
  addMonths,
  daysUntil,
  formatDateRange,
  formatMonthLabel,
  type BillBlocker,
  type CheckBillRequest,
  type CheckBillResponse,
} from "@splithouse/shared";
import { buildLinesNote } from "./lines-note";

/**
 * The longest billing period allowed, counted as the days from the first day to the last day. A
 * period from the 3rd to the 2nd of the next month is 30 days in a 31-day month, 27 in February.
 */
export const MAX_BILLING_PERIOD_DAYS = 30;

/**
 * One check that can stop Save: looks at the form's values and returns the problem, or `null` when
 * there is none. Pure.
 *
 * @param month - `YYYY-MM`, the month the upload started from.
 * @param fields - The form's values as they are right now.
 */
type BlockerCheck = (month: string, fields: CheckBillRequest) => BillBlocker | null;

/**
 * The bill month on the bill is the month the bill belongs to, so it has to be the month the
 * upload started from.
 */
const checkBillMonth: BlockerCheck = (month, { billMonth }) => {
  // Empty or unreadable text is the form's own required error, not a mismatch.
  if (billMonth === null || billMonth === month) return null;
  return {
    field: "billMonth",
    title: "Did you attach the wrong bill?",
    message: `This bill is for ${formatMonthLabel(billMonth)}, but you're uploading for ${formatMonthLabel(month)}. If the bill is right and this was misread, edit the Bill month.`,
    fieldMessage: "Invalid bill month",
  };
};

/**
 * A bill pays for the month before it, so the billing period has to start in the month before the
 * month the upload started from (the November bill covers 3 Oct to 2 Nov) and run for at most
 * {@link MAX_BILLING_PERIOD_DAYS} days, so a day picked in the wrong month or year is caught. The
 * end is not matched to a month: the period runs into the next one. It is judged against the
 * upload month, not the typed Bill month, so it stays flagged while the Bill month is also wrong.
 */
const checkBillingPeriod: BlockerCheck = (month, fields) => {
  const { billingPeriodStart: start, billingPeriodEnd: end } = fields;
  // Anything missing is the form's own required error.
  if (start === null || end === null) return null;

  const message = (rule: string) =>
    `The billing period (${formatDateRange(start, end)}) doesn't fit a ${formatMonthLabel(month)} bill. ${rule}`;
  // The field only says it is invalid; the Alert says why.
  const problem = (rule: string): BillBlocker => ({
    field: "billingPeriod",
    title: "Check the billing period",
    message: message(rule),
    fieldMessage: "Invalid billing period",
  });

  const days = daysUntil(end, start);
  // A bill pays for the month before it: the November bill covers 3 Oct to 2 Nov.
  const startMonth = addMonths(month, -1);
  if (start.slice(0, 7) !== startMonth) return problem(`It should start in ${formatMonthLabel(startMonth)}.`);
  if (days < 0) return problem("It ends before it starts.");
  if (days > MAX_BILLING_PERIOD_DAYS) {
    return problem(`It should end at most ${MAX_BILLING_PERIOD_DAYS} days after it starts.`);
  }
  return null;
};

/** Every check that can stop Save, in form order. To add one, write a {@link BlockerCheck} and list it here. */
const BLOCKER_CHECKS: readonly BlockerCheck[] = [checkBillMonth, checkBillingPeriod];

/**
 * Checks the Review bill values against the month the upload started from. Pure; the same
 * function answers the check endpoint and guards Save.
 *
 * @param month - `YYYY-MM`, the month the upload started from.
 * @param fields - The form's values as they are right now.
 * @returns The problems that stop Save, in form order, and the note under the lines.
 */
export function checkBill(month: string, fields: CheckBillRequest): CheckBillResponse {
  const blockers = BLOCKER_CHECKS.map((check) => check(month, fields)).filter(
    (blocker): blocker is BillBlocker => blocker !== null,
  );
  return { blockers, linesNote: buildLinesNote(fields.subtotalCents, fields.lines) };
}
