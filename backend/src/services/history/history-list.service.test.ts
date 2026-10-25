import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildHistoryList,
  type HistoryBillRow,
  type HistoryChargeRow,
} from "@/lib/history/build-history-list";
import { getHistoryList, type HistoryListDb } from "./history-list.service";

function fakeDb(
  bills: HistoryBillRow[],
  charges: HistoryChargeRow[],
  newestMonth: string | null = null,
): HistoryListDb {
  return {
    bill: { findMany: async () => bills },
    charge: { findMany: async () => charges },
    month: { findFirst: async () => (newestMonth ? { month: newestMonth } : null) },
  };
}

afterEach(() => vi.unstubAllEnvs());

describe("getHistoryList", () => {
  it("passes what the queries return to the builder", async () => {
    const bills = [{ month: "2026-09", currentChargesCents: 40100 }];
    const charges = [{ month: "2026-09", correctsMonth: null, paidCents: 95000 }];
    expect(await getHistoryList(fakeDb(bills, charges))).toEqual(buildHistoryList(bills, charges));
  });

  it("returns no groups when the queries find nothing", async () => {
    expect(await getHistoryList(fakeDb([], []))).toEqual({ groups: [] });
  });

  it("treats every month before the newest opened month as past, even ahead of the calendar", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-29T09:00:00+08:00");
    const lt: string[] = [];
    const db = fakeDb([], [], "2026-12");
    db.bill.findMany = async ({ where }) => {
      lt.push(where.month.lt);
      return [];
    };
    await getHistoryList(db);
    expect(lt).toEqual(["2026-12"]);
  });
});
