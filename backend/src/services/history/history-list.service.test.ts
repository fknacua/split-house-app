import { describe, expect, it } from "vitest";
import {
  buildHistoryList,
  type HistoryBillRow,
  type HistoryChargeRow,
} from "@/lib/history/build-history-list";
import { getHistoryList, type HistoryListDb } from "./history-list.service";

function fakeDb(bills: HistoryBillRow[], charges: HistoryChargeRow[]): HistoryListDb {
  return {
    bill: { findMany: async () => bills },
    charge: { findMany: async () => charges },
  };
}

describe("getHistoryList", () => {
  it("passes what the queries return to the builder", async () => {
    const bills = [{ month: "2026-09", currentChargesCents: 40100 }];
    const charges = [{ month: "2026-09", correctsMonth: null, paidCents: 95000 }];
    expect(await getHistoryList(fakeDb(bills, charges))).toEqual(buildHistoryList(bills, charges));
  });

  it("returns no groups when the queries find nothing", async () => {
    expect(await getHistoryList(fakeDb([], []))).toEqual({ groups: [] });
  });
});
