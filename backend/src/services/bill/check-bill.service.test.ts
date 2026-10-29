import { describe, expect, it } from "vitest";
import type { CheckBillRequest } from "@splithouse/shared";
import { checkBillDraft, type CheckBillDb } from "./check-bill.service";

const FIELDS: CheckBillRequest = {
  currentChargesCents: 40000,
  billMonth: "2026-11",
  dueDate: "2026-11-16",
  billingPeriodStart: "2026-10-03",
  billingPeriodEnd: "2026-11-02",
  subtotalCents: null,
  lines: [],
};

/** A fake that records what the service asked for and answers with the given saved bills. */
function fakeDb(bills: number[]) {
  const asked: unknown[] = [];
  const db: CheckBillDb = {
    bill: {
      findMany: async (args) => {
        asked.push(args);
        return bills.map((currentChargesCents) => ({ currentChargesCents }));
      },
    },
  };
  return { db, asked };
}

describe("checkBillDraft", () => {
  it("reads the last three saved bills before the month and warns when the bill is unusual", async () => {
    const { db, asked } = fakeDb([38000, 40000, 42000]);
    const result = await checkBillDraft(db, "2026-11", { ...FIELDS, currentChargesCents: 56000 });
    expect(result.warnings).toEqual(["This bill is 40% higher than your recent bills."]);
    expect(asked).toEqual([
      {
        where: { month: { lt: "2026-11" } },
        orderBy: { month: "desc" },
        take: 3,
        select: { currentChargesCents: true },
      },
    ]);
  });

  it("has no warnings for a bill in range, with the blockers and lines note passed through", async () => {
    const { db } = fakeDb([38000, 40000, 42000]);
    expect(await checkBillDraft(db, "2026-11", FIELDS)).toEqual({ blockers: [], linesNote: null, warnings: [] });
  });

  it("has no warning when there are no saved bills", async () => {
    const { db } = fakeDb([]);
    expect((await checkBillDraft(db, "2026-11", { ...FIELDS, currentChargesCents: 90000 })).warnings).toEqual([]);
  });

  it("does not read the saved bills without an amount", async () => {
    const { db, asked } = fakeDb([40000]);
    const result = await checkBillDraft(db, "2026-11", { ...FIELDS, currentChargesCents: null });
    expect(result.warnings).toEqual([]);
    expect(asked).toEqual([]);
  });
});
