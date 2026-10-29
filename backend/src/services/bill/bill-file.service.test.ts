import { describe, expect, it } from "vitest";
import type { StoredBillFile } from "@/lib/bill/bill-file-store";
import { getBillFile, type BillFileReadDb } from "./bill-file.service";

const FILE: StoredBillFile = {
  filename: "bill.pdf",
  mimeType: "application/pdf",
  sizeBytes: 9,
  pageCount: 2,
  bytes: new TextEncoder().encode("%PDF-1.4 "),
};

function fakeDb(bill: { id: string } | null, file: StoredBillFile | null): BillFileReadDb {
  return {
    bill: { findUnique: async () => bill },
    billFile: {
      create: async () => undefined,
      findUnique: async ({ where }) => (where.billId === bill?.id ? file : null),
      deleteMany: async () => undefined,
    },
  };
}

describe("getBillFile", () => {
  it("returns the saved bill's file", async () => {
    expect(await getBillFile(fakeDb({ id: "bill-1" }, FILE), "2026-11")).toEqual(FILE);
  });

  it("answers 404 no_bill when the month has no saved bill", async () => {
    await expect(getBillFile(fakeDb(null, null), "2026-11")).rejects.toMatchObject({ status: 404, code: "no_bill" });
  });

  it("answers 404 no_file when the bill has no file", async () => {
    await expect(getBillFile(fakeDb({ id: "bill-1" }, null), "2026-11")).rejects.toMatchObject({
      status: 404,
      code: "no_file",
    });
  });
});
