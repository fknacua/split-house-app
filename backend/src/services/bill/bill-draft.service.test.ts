import { describe, expect, it } from "vitest";
import { billDraftResponseSchema, MAX_BILL_PDF_BYTES } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { BILL_FIXTURE } from "@/lib/fixtures/bill";
import { generateBillFixturePdf } from "@/lib/fixtures/generate-bill-pdf";
import { getBillDraft, uploadBillDraft, type BillDraftDb } from "./bill-draft.service";

interface DraftRow {
  month: string;
  filename: string;
  bytes: Uint8Array;
  parsedJson?: unknown;
  parseOk: boolean;
}

/** November is open; `hasBill` decides whether it already has a saved bill. */
function fakeDb({ hasBill = false, open = ["2026-11"], drafts = [] as DraftRow[] } = {}) {
  const rows = new Map(drafts.map((d) => [d.month, d]));
  const db: BillDraftDb = {
    month: { findUnique: async ({ where }) => (open.includes(where.month) ? { month: where.month } : null) },
    bill: { findUnique: async () => (hasBill ? { id: "bill-1" } : null) },
    billDraft: {
      findUnique: async ({ where }) => {
        const row = rows.get(where.month);
        return row ? { filename: row.filename, bytes: row.bytes, parsedJson: row.parsedJson ?? null } : null;
      },
      create: async ({ data }) => {
        rows.set(data.month, data);
      },
      deleteMany: async ({ where }) => {
        for (const month of [...rows.keys()]) if (month <= where.month.lte) rows.delete(month);
      },
    },
  };
  return { db, rows };
}

async function fixtureFile() {
  return { filename: "Utilities_Bill_Nov2026.pdf", bytes: new Uint8Array(await generateBillFixturePdf()) };
}

async function expectApiError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status, code });
}

describe("uploadBillDraft", () => {
  it("stores the PDF as the month's draft and returns what was read, in the shared shape", async () => {
    const { db, rows } = fakeDb();
    const response = await uploadBillDraft(db, "2026-11", await fixtureFile());

    expect(billDraftResponseSchema.parse(response)).toMatchObject({
      month: "2026-11",
      file: { filename: "Utilities_Bill_Nov2026.pdf" },
      readOk: true,
      fields: { currentChargesCents: BILL_FIXTURE.currentChargesCents },
    });
    expect(response.file.meta).toMatch(/^1 page · \d+ KB$/);
    expect(rows.get("2026-11")).toMatchObject({ parseOk: true, parsedJson: BILL_FIXTURE });
  });

  it("replaces the month's old draft and purges drafts left for earlier months", async () => {
    const old = { filename: "old.pdf", bytes: new Uint8Array([1]), parseOk: false };
    const { db, rows } = fakeDb({
      drafts: [
        { ...old, month: "2026-10" },
        { ...old, month: "2026-11" },
      ],
    });
    await uploadBillDraft(db, "2026-11", await fixtureFile());
    expect([...rows.keys()]).toEqual(["2026-11"]);
    expect(rows.get("2026-11")?.filename).toBe("Utilities_Bill_Nov2026.pdf");
  });

  it("stores an unreadable PDF too, with readOk false", async () => {
    const { db, rows } = fakeDb();
    const bytes = new TextEncoder().encode("%PDF-1.4\n% not really a PDF\n%%EOF\n");
    const response = await uploadBillDraft(db, "2026-11", { filename: "scan.pdf", bytes });
    expect(response.readOk).toBe(false);
    expect(rows.get("2026-11")).toMatchObject({ parseOk: false, parsedJson: undefined });
  });

  it("rejects a file that is not a PDF with 415", async () => {
    const { db } = fakeDb();
    const bytes = new TextEncoder().encode("PK\u0003\u0004 a zip");
    await expectApiError(uploadBillDraft(db, "2026-11", { filename: "bill.pdf", bytes }), 415, "not_pdf");
  });

  it("rejects a file over the limit with 413", async () => {
    const { db } = fakeDb();
    const bytes = new Uint8Array(MAX_BILL_PDF_BYTES + 1);
    bytes.set(new TextEncoder().encode("%PDF-"));
    await expectApiError(uploadBillDraft(db, "2026-11", { filename: "big.pdf", bytes }), 413, "file_too_large");
  });

  it("rejects a month that already has a bill with 409", async () => {
    const { db } = fakeDb({ hasBill: true });
    await expectApiError(uploadBillDraft(db, "2026-11", await fixtureFile()), 409, "bill_exists");
  });

  it("rejects a month that is not open with 409", async () => {
    const { db } = fakeDb({ open: [] });
    await expectApiError(uploadBillDraft(db, "2026-11", await fixtureFile()), 409, "month_not_open");
  });
});

describe("getBillDraft", () => {
  it("reads back the stored draft in the shared shape", async () => {
    const { db } = fakeDb();
    const uploaded = await uploadBillDraft(db, "2026-11", await fixtureFile());
    expect(billDraftResponseSchema.parse(await getBillDraft(db, "2026-11"))).toEqual(uploaded);
  });

  it("returns 404 when the month has no draft", async () => {
    const { db } = fakeDb();
    await expectApiError(getBillDraft(db, "2026-11"), 404, "no_draft");
  });
});
