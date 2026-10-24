import {
  dateKeyOf,
  formatCents,
  formatDateShort,
  formatMonthLabel,
  formatMonthShort,
  type BadgeContent,
  type HistoryBanner,
  type HistoryMonthResponse,
  type HistoryPayment,
} from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";

/** The month's bill, as much of it as the month detail needs. */
export interface HistoryMonthBillRow {
  currentChargesCents: number;
  paidOn: Date | null;
}

/** A charge, as much of it as the month detail needs. */
export interface HistoryMonthChargeRow {
  month: string;
  category: ChargeCategory;
  label: string;
  amountCents: number;
  paidCents: number | null;
  paidOn: Date | null;
  correctsMonth: string | null;
  correctsCategory: ChargeCategory | null;
  createdAt: Date;
  person: { name: string };
}

const CATEGORY_WORDS: Partial<Record<ChargeCategory, string>> = {
  RENT: "Rent",
  UTILITIES: "Utils",
  AIRCON: "Aircon",
};

function paidBadge(paidOn: Date | null): BadgeContent {
  if (paidOn === null) return { label: "Paid", tone: "success" };
  return { label: `Paid ${formatDateShort(dateKeyOf(paidOn))}`, tone: "success" };
}

/** The row title: `<label> - <person>`, or `Correction - <person>` whatever label a correction has. */
function buildTitleByCategory(charge: HistoryMonthChargeRow): string {
  switch (charge.category) {
    case "CORRECTION":
      return `Correction - ${charge.person.name}`;
    default:
      return `${charge.label} - ${charge.person.name}`;
  }
}

/** The small lines under the title: what a correction fixes, e.g. `Sep Utils - Added 2 Oct`. */
function buildDetailsByCategory(charge: HistoryMonthChargeRow): string[] {
  switch (charge.category) {
    case "CORRECTION": {
      if (!charge.correctsMonth || !charge.correctsCategory) return [];
      const fixed = `${formatMonthShort(charge.correctsMonth)} ${CATEGORY_WORDS[charge.correctsCategory] ?? "Other"}`;
      return [`${fixed} - Added ${formatDateShort(dateKeyOf(charge.createdAt))}`];
    }
    default:
      return [];
  }
}

/** Paid with its date, or Unpaid. */
function buildStatusBadge(charge: HistoryMonthChargeRow): BadgeContent {
  return charge.paidCents === null ? { label: "Unpaid", tone: "warning" } : paidBadge(charge.paidOn);
}

function buildPayment(charge: HistoryMonthChargeRow, badge: BadgeContent): HistoryPayment {
  return {
    title: buildTitleByCategory(charge),
    amount: formatCents(charge.amountCents),
    details: buildDetailsByCategory(charge),
    badge,
  };
}

/** The notice on a month that a later `correction` charge fixed. */
function buildCorrectionBanner(correction: HistoryMonthChargeRow): HistoryBanner {
  const when = formatMonthShort(correction.month);
  const amount = formatCents(Math.abs(correction.amountCents));
  const kind = correction.amountCents < 0 ? "credit" : "charge";
  return {
    tone: "info",
    title: `Corrected in ${when}`,
    text: `A ${amount} ${kind} for ${correction.person.name} was added in ${when}.`,
  };
}

/**
 * Turns a month's bill and charges into the month detail response. Pure: no database, no clock.
 *
 * Every charge the month holds is one row, titled `<label> - <person>` (`Correction - <person>`
 * for a correction). Unpaid rows come first, then paid rows with the most recent payment first;
 * rows tied on the date sort by label, then person. The row amount is what was owed, so a short
 * payment is not shown differently yet. A correction is a row in the month that holds it, not in
 * the month it fixes; that month only gets a banner for each one, oldest first.
 *
 * @param month - The month key, e.g. `2026-11`.
 * @param bill - The month's saved bill.
 * @param charges - Every charge the month holds.
 * @param corrections - Charges, held by later months, that correct this month. Used for banners.
 */
export function buildHistoryMonth(
  month: string,
  bill: HistoryMonthBillRow,
  charges: HistoryMonthChargeRow[],
  corrections: HistoryMonthChargeRow[],
): HistoryMonthResponse {
  const own = [...charges]
    .sort(byUnpaidThenNewestPayment)
    .map((charge) => buildPayment(charge, buildStatusBadge(charge)));

  const oldestFirst = [...corrections].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return {
    month,
    name: formatMonthLabel(month),
    banners: oldestFirst.map(buildCorrectionBanner),
    bill: {
      amount: formatCents(bill.currentChargesCents),
      badge: bill.paidOn === null ? null : paidBadge(bill.paidOn),
    },
    payments: own,
  };
}

/** Unpaid first, then the most recent payment first; ties by label, then person. */
function byUnpaidThenNewestPayment(a: HistoryMonthChargeRow, b: HistoryMonthChargeRow): number {
  const aUnpaid = a.paidCents === null;
  if (aUnpaid !== (b.paidCents === null)) return aUnpaid ? -1 : 1;
  const newestFirst = (b.paidOn?.getTime() ?? 0) - (a.paidOn?.getTime() ?? 0);
  return newestFirst || a.label.localeCompare(b.label) || a.person.name.localeCompare(b.person.name);
}
