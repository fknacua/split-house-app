import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import {
  buildHistoryMonth,
  type HistoryMonthBillRow,
  type HistoryMonthChargeRow,
} from "@/lib/history/build-history-month";
import { currentMonth } from "@/lib/month";
import { getHistoryMonth, type HistoryMonthDb } from "./history-month.service";

/** Answers the month's own charges and the corrections query from their own lists. */
function fakeDb(
  bill: HistoryMonthBillRow | null,
  charges: HistoryMonthChargeRow[],
  corrections: HistoryMonthChargeRow[] = [],
  newestMonth: string | null = null,
): HistoryMonthDb {
  return {
    bill: { findUnique: async () => bill },
    charge: { findMany: async ({ where }) => ("correctsMonth" in where ? corrections : charges) },
    month: { findFirst: async () => (newestMonth ? { month: newestMonth } : null) },
  };
}

const row = (label: string, correctsMonth: string | null): HistoryMonthChargeRow => ({
  month: correctsMonth ? "2026-10" : "2026-09",
  category: correctsMonth ? "CORRECTION" : "RENT",
  label,
  amountCents: 95000,
  paidCents: 95000,
  paidOn: new Date("2026-09-21T00:00:00Z"),
  correctsMonth,
  correctsCategory: correctsMonth ? "UTILITIES" : null,
  createdAt: new Date("2026-10-05T02:00:00Z"),
  person: { name: "Sam" },
});

const BILL = { currentChargesCents: 40100, paidOn: new Date("2026-09-22T00:00:00Z") };
const CHARGES = [row("Rent", null)];
const CORRECTIONS = [row("Correction", "2026-09")];

describe("getHistoryMonth", () => {
  it("passes what the queries return to the builder", async () => {
    expect(await getHistoryMonth(fakeDb(BILL, CHARGES, CORRECTIONS), "2026-09")).toEqual(
      buildHistoryMonth("2026-09", BILL, CHARGES, CORRECTIONS),
    );
  });

  it("answers 404 when the month has no saved bill", async () => {
    await expect(getHistoryMonth(fakeDb(null, []), "2026-09")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("answers 404 for the current month and later, which are not history", async () => {
    const error = await getHistoryMonth(fakeDb(BILL, CHARGES), currentMonth()).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
  });
});

describe("getHistoryMonth with a month started early", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("serves the month before the newest opened month, though it is still the calendar month", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-29T09:00:00+08:00");
    const response = await getHistoryMonth(fakeDb(BILL, CHARGES, [], "2026-12"), "2026-11");
    expect(response.month).toBe("2026-11");
  });
});
