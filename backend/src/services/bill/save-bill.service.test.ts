import { describe, expect, it } from "vitest";
import { HOUSEHOLD_SCHEMA_VERSION, saveBillResponseSchema, type SaveBillRequest } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { NOV_2026_CONFIG } from "@/lib/fixtures/household";
import { buildUtilitiesCharges } from "@/lib/split/engine";
import { saveBill, type SaveBillDb, type SaveBillTx } from "./save-bill.service";

const VALUES: SaveBillRequest = {
  currentChargesCents: 41230,
  billMonth: "2026-11",
  dueDate: "2026-11-16",
  billingPeriodStart: "2026-10-03",
  billingPeriodEnd: "2026-11-02",
  lines: [
    { label: "Electricity", cents: 26845 },
    { label: "Gas", cents: null },
  ],
};

const PDF = new TextEncoder().encode("%PDF-1.4 sample");

/** November is open on version B with a parsed draft waiting; the flags take pieces away. */
function fakeDb({ hasDraft = true, hasBill = false, open = true } = {}) {
  const state = {
    draft: hasDraft ? { filename: "Utilities_Bill_Nov2026.pdf", bytes: PDF, parseOk: true } : null,
    bill: null as Record<string, unknown> | null,
    file: null as object | null,
    charges: [] as Record<string, unknown>[],
  };
  const tx: SaveBillTx = {
    billDraft: {
      findUnique: async () => state.draft,
      deleteMany: async () => {
        state.draft = null;
      },
    },
    bill: {
      findUnique: async () => (hasBill ? { id: "bill-old" } : null),
      create: async ({ data }) => {
        state.bill = data;
        return { id: "bill-1" };
      },
    },
    billFile: {
      create: async ({ data }) => {
        state.file = data;
      },
      findUnique: async () => null,
      deleteMany: async () => undefined,
    },
    month: {
      findUnique: async () =>
        open
          ? {
              householdVersionId: "v-b",
              householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
            }
          : null,
    },
    charge: {
      createMany: async ({ data }) => {
        state.charges.push(...data);
      },
    },
  };
  const db: SaveBillDb = { $transaction: (fn) => fn(tx) };
  return { db, state };
}

async function expectApiError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status, code });
}

describe("saveBill", () => {
  it("moves the draft into the bill and its file, creates the utilities charges and deletes the draft", async () => {
    const { db, state } = fakeDb();
    const response = await saveBill(db, "2026-11", VALUES);

    expect(saveBillResponseSchema.parse(response)).toEqual({ month: "2026-11" });
    expect(state.bill).toMatchObject({
      month: "2026-11",
      currentChargesCents: 41230,
      dueDate: new Date("2026-11-16"),
      billingPeriodStart: new Date("2026-10-03"),
      lines: VALUES.lines,
      parseStatus: "PARSED",
    });
    // The sample bytes are not a real PDF, so no page count is stored.
    expect(state.file).toMatchObject({ billId: "bill-1", mimeType: "application/pdf", sizeBytes: PDF.byteLength, pageCount: null });
    const expected = buildUtilitiesCharges(NOV_2026_CONFIG, { month: "2026-11", currentChargesCents: 41230 });
    expect(state.charges).toHaveLength(expected.length);
    expect(state.charges.reduce((sum, c) => sum + (c.amountCents as number), 0)).toBe(41230);
    expect(state.charges.every((c) => c.billId === "bill-1" && c.category === "UTILITIES")).toBe(true);
    expect(state.draft).toBeNull();
  });

  it("stores NOT_PARSED for a bill typed in by hand", async () => {
    const { db, state } = fakeDb();
    state.draft = { ...state.draft!, parseOk: false };
    await saveBill(db, "2026-11", VALUES);
    expect(state.bill).toMatchObject({ parseStatus: "NOT_PARSED" });
  });

  it("returns 422 and saves nothing when the bill is for another month", async () => {
    const { db, state } = fakeDb();
    await expectApiError(saveBill(db, "2026-11", { ...VALUES, billMonth: "2026-10" }), 422, "bill_blocked");
    expect(state.bill).toBeNull();
    expect(state.charges).toHaveLength(0);
    expect(state.draft).not.toBeNull();
  });

  it("returns 422 and saves nothing when the billing period does not start in the month before the bill month or runs over 30 days", async () => {
    for (const period of [
      { billingPeriodStart: "2026-11-03", billingPeriodEnd: "2026-12-02" },
      { billingPeriodStart: "2026-10-03", billingPeriodEnd: "2026-12-10" },
    ]) {
      const { db, state } = fakeDb();
      await expectApiError(saveBill(db, "2026-11", { ...VALUES, ...period }), 422, "bill_blocked");
      expect(state.bill).toBeNull();
    }
  });

  it("returns 404 when there is no draft", async () => {
    const { db } = fakeDb({ hasDraft: false });
    await expectApiError(saveBill(db, "2026-11", VALUES), 404, "no_draft");
  });

  it("returns 409 when the month already has a bill", async () => {
    const { db, state } = fakeDb({ hasBill: true });
    await expectApiError(saveBill(db, "2026-11", VALUES), 409, "bill_exists");
    expect(state.charges).toHaveLength(0);
  });

  it("returns 409 when a second save loses the race on the unique month", async () => {
    const db: SaveBillDb = {
      $transaction: async () => {
        throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
      },
    };
    await expectApiError(saveBill(db, "2026-11", VALUES), 409, "bill_exists");
  });

  it("returns 409 when the month is not open", async () => {
    const { db } = fakeDb({ open: false });
    await expectApiError(saveBill(db, "2026-11", VALUES), 409, "month_not_open");
  });
});
