import {
  formatCents,
  formatMonthLabel,
  type BadgeContent,
  type HistoryGroup,
  type HistoryListResponse,
} from "@splithouse/shared";

/** A saved bill, as much of it as the History list needs. */
export interface HistoryBillRow {
  month: string;
  currentChargesCents: number;
}

/** A charge, as much of it as the History list needs. */
export interface HistoryChargeRow {
  month: string;
  correctsMonth: string | null;
  paidCents: number | null;
}

/**
 * Turns bills and charges into the History list response. Pure: no database, no clock.
 *
 * A month is "Settled" when every charge it holds has a payment recorded (a short payment counts,
 * there is no carry); otherwise it shows how many are unpaid. A month gets "Corrected" when any
 * charge, in any month, corrects it.
 *
 * @param bills - Saved bills of the months to list, newest month first.
 * @param charges - Charges held by those months, plus charges that correct them.
 * @returns The months grouped by year, in the order the bills came in.
 */
export function buildHistoryList(
  bills: HistoryBillRow[],
  charges: HistoryChargeRow[],
): HistoryListResponse {
  const unpaidByMonth = new Map<string, number>();
  const correctedMonths = new Set<string>();
  for (const charge of charges) {
    if (charge.paidCents === null) {
      unpaidByMonth.set(charge.month, (unpaidByMonth.get(charge.month) ?? 0) + 1);
    }
    if (charge.correctsMonth !== null) correctedMonths.add(charge.correctsMonth);
  }

  const groups: HistoryGroup[] = [];
  for (const bill of bills) {
    const unpaid = unpaidByMonth.get(bill.month) ?? 0;
    const chips: BadgeContent[] = [
      unpaid === 0
        ? { label: "Settled", tone: "success" }
        : { label: `${unpaid} unpaid`, tone: "warning" },
    ];
    if (correctedMonths.has(bill.month)) chips.push({ label: "Corrected", tone: "info" });

    const year = bill.month.slice(0, 4);
    let group = groups.at(-1);
    if (group?.year !== year) {
      group = { year, months: [] };
      groups.push(group);
    }
    group.months.push({
      month: bill.month,
      name: formatMonthLabel(bill.month),
      details: [`Utilities bill ${formatCents(bill.currentChargesCents)}`],
      chips,
    });
  }
  return { groups };
}
