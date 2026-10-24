import { historyMonthResponseSchema } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import {
  buildHistoryMonth,
  type HistoryMonthBillRow,
  type HistoryMonthChargeRow,
} from "./build-history-month";

// @db.Date values come back as UTC midnight.
const day = (key: string) => new Date(`${key}T00:00:00Z`);

const charge = (
  label: string,
  name: string,
  amountCents: number,
  paidOn: string | null,
): HistoryMonthChargeRow => ({
  month: "2026-11",
  category: "RENT",
  label,
  amountCents,
  paidCents: paidOn === null ? null : amountCents,
  paidOn: paidOn === null ? null : day(paidOn),
  correctsMonth: null,
  correctsCategory: null,
  createdAt: new Date("2026-11-01T01:00:00Z"),
  person: { name },
});

// A correction of September utilities, held by October and added on 5 Oct (Singapore time).
const correction = (
  name: string,
  amountCents: number,
  paidOn: string | null = null,
): HistoryMonthChargeRow => ({
  ...charge("Correction", name, amountCents, paidOn),
  month: "2026-10",
  category: "CORRECTION",
  correctsMonth: "2026-09",
  correctsCategory: "UTILITIES",
  createdAt: new Date("2026-10-05T02:00:00Z"),
});

const BILL: HistoryMonthBillRow = { currentChargesCents: 41230, paidOn: day("2026-11-16") };

// Shaped like the happy path: everything paid in full.
const CHARGES = [
  charge("Rent", "Tenant 2", 95000, "2026-11-03"),
  charge("Utilities", "Tenant 2", 8246, "2026-11-04"),
  charge("Utilities", "Tenant 1", 8246, "2026-11-07"),
  charge("Rent", "Tenant 1", 95000, "2026-11-07"),
];

describe("buildHistoryMonth", () => {
  it("names the month and shows the bill with its paid date", () => {
    const result = buildHistoryMonth("2026-11", BILL, CHARGES, []);
    expect(result.month).toBe("2026-11");
    expect(result.name).toBe("November 2026");
    expect(result.bill).toEqual({
      amount: "$412.30",
      badge: { label: "Paid 16 Nov", tone: "success" },
    });
  });

  it("makes one row per charge, label first, newest payment first, ties by label then person", () => {
    const { payments, banners } = buildHistoryMonth("2026-11", BILL, CHARGES, []);
    expect(payments).toEqual([
      { title: "Rent - Tenant 1", amount: "$950.00", details: [], badge: { label: "Paid 7 Nov", tone: "success" } },
      { title: "Utilities - Tenant 1", amount: "$82.46", details: [], badge: { label: "Paid 7 Nov", tone: "success" } },
      { title: "Utilities - Tenant 2", amount: "$82.46", details: [], badge: { label: "Paid 4 Nov", tone: "success" } },
      { title: "Rent - Tenant 2", amount: "$950.00", details: [], badge: { label: "Paid 3 Nov", tone: "success" } },
    ]);
    expect(banners).toEqual([]);
  });

  it("puts unpaid rows first with the Unpaid badge", () => {
    const { payments } = buildHistoryMonth(
      "2026-11",
      BILL,
      [charge("Rent", "Tenant 2", 95000, "2026-11-03"), charge("Rent", "Tenant 1", 95000, null)],
      [],
    );
    expect(payments.map((p) => [p.title, p.badge])).toEqual([
      ["Rent - Tenant 1", { label: "Unpaid", tone: "warning" }],
      ["Rent - Tenant 2", { label: "Paid 3 Nov", tone: "success" }],
    ]);
  });

  it("shows no bill badge while the bill is not marked paid", () => {
    const { bill } = buildHistoryMonth("2026-11", { ...BILL, paidOn: null }, CHARGES, []);
    expect(bill.badge).toBeNull();
  });

  it("has no rows for a month with no charges", () => {
    expect(buildHistoryMonth("2026-11", BILL, [], []).payments).toEqual([]);
  });

  describe("corrections", () => {
    it("adds a banner, and no row, to the month that was corrected", () => {
      const result = buildHistoryMonth("2026-09", BILL, CHARGES, [correction("Jordan", 1500)]);
      expect(result.banners).toEqual([
        { tone: "info", title: "Corrected in Oct", text: "A $15.00 charge for Jordan was added in Oct." },
      ]);
      expect(result.payments).toHaveLength(CHARGES.length);
    });

    it("calls a negative correction a credit", () => {
      const result = buildHistoryMonth("2026-09", BILL, CHARGES, [correction("Tenant 2", -820)]);
      expect(result.banners[0].text).toBe("A $8.20 credit for Tenant 2 was added in Oct.");
    });

    it("makes a banner per correction, oldest first", () => {
      const later = { ...correction("Sam", 500), createdAt: new Date("2026-10-09T02:00:00Z") };
      const result = buildHistoryMonth("2026-09", BILL, CHARGES, [later, correction("Jordan", 1500)]);
      expect(result.banners.map((b) => b.text)).toEqual([
        "A $15.00 charge for Jordan was added in Oct.",
        "A $5.00 charge for Sam was added in Oct.",
      ]);
    });

    it("lists a correction the month holds as its own row with its paid state", () => {
      const unpaid = buildHistoryMonth("2026-10", BILL, [correction("Jordan", 1500)], []).payments;
      expect(unpaid).toEqual([
        {
          title: "Correction - Jordan",
          amount: "$15.00",
          details: ["Sep Utils - Added 5 Oct"],
          badge: { label: "Unpaid", tone: "warning" },
        },
      ]);
      const paid = buildHistoryMonth("2026-10", BILL, [correction("Sam", -500, "2026-10-12")], []);
      expect(paid.payments[0]).toMatchObject({
        title: "Correction - Sam",
        amount: "-$5.00",
        badge: { label: "Paid 12 Oct", tone: "success" },
      });
    });

    it("says Other when a correction fixes a category with no short word", () => {
      const other = { ...correction("Jordan", 1500), correctsCategory: "ONE_OFF" as const };
      expect(buildHistoryMonth("2026-10", BILL, [other], []).payments[0].details).toEqual([
        "Sep Other - Added 5 Oct",
      ]);
    });
  });

  it("matches the shared response schema the app reads", () => {
    expect(
      historyMonthResponseSchema.safeParse(
        buildHistoryMonth("2026-09", BILL, CHARGES, [correction("Jordan", 1500)]),
      ).success,
    ).toBe(true);
  });
});
