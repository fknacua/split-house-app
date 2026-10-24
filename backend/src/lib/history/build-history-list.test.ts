import { historyListResponseSchema } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { buildHistoryList, type HistoryBillRow, type HistoryChargeRow } from "./build-history-list";

// Shaped like the Aug to Oct 2026 seed: Aug settled, Sep settled then corrected from Oct, Oct with
// a short payment, an unpaid rent and an unpaid correction (the correction counts in Oct).
const BILLS: HistoryBillRow[] = [
  { month: "2026-10", currentChargesCents: 42800 },
  { month: "2026-09", currentChargesCents: 40100 },
  { month: "2026-08", currentChargesCents: 39500 },
];

const charge = (
  month: string,
  paidCents: number | null,
  correctsMonth: string | null = null,
): HistoryChargeRow => ({ month, paidCents, correctsMonth });

const CHARGES: HistoryChargeRow[] = [
  charge("2026-08", 95000),
  charge("2026-08", 8246),
  charge("2026-09", 95000),
  charge("2026-09", 8246),
  charge("2026-10", 93000), // short-paid: still paid, no carry
  charge("2026-10", null), // unpaid rent
  charge("2026-10", 8246),
  charge("2026-10", null, "2026-09"), // unpaid correction of September, held by October
];

describe("buildHistoryList", () => {
  it("groups the months by year, newest first, with the bill total as the one detail line", () => {
    const { groups } = buildHistoryList(BILLS, CHARGES);
    expect(groups).toHaveLength(1);
    expect(groups[0].year).toBe("2026");
    expect(groups[0].months.map((m) => [m.month, m.name, m.details])).toEqual([
      ["2026-10", "October 2026", ["Utilities bill $428.00"]],
      ["2026-09", "September 2026", ["Utilities bill $401.00"]],
      ["2026-08", "August 2026", ["Utilities bill $395.00"]],
    ]);
  });

  it("shows Settled when every charge has a payment, and Corrected when a later charge corrects it", () => {
    const months = buildHistoryList(BILLS, CHARGES).groups[0].months;
    expect(months.find((m) => m.month === "2026-08")?.chips).toEqual([
      { label: "Settled", tone: "success" },
    ]);
    expect(months.find((m) => m.month === "2026-09")?.chips).toEqual([
      { label: "Settled", tone: "success" },
      { label: "Corrected", tone: "info" },
    ]);
  });

  it("counts a short payment as paid and the unpaid correction in the month that holds it", () => {
    const october = buildHistoryList(BILLS, CHARGES).groups[0].months[0];
    expect(october.chips).toEqual([{ label: "2 unpaid", tone: "warning" }]);
  });

  it("starts a new group at the year boundary", () => {
    const { groups } = buildHistoryList(
      [{ month: "2027-01", currentChargesCents: 39875 }, ...BILLS],
      [charge("2027-01", 95000), ...CHARGES],
    );
    expect(groups.map((g) => [g.year, g.months.length])).toEqual([
      ["2027", 1],
      ["2026", 3],
    ]);
  });

  it("returns no groups when there are no bills", () => {
    expect(buildHistoryList([], [])).toEqual({ groups: [] });
  });

  it("matches the shared response schema the app reads", () => {
    expect(historyListResponseSchema.safeParse(buildHistoryList(BILLS, CHARGES)).success).toBe(true);
    expect(historyListResponseSchema.safeParse(buildHistoryList([], [])).success).toBe(true);
  });
});
