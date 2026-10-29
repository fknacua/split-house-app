import { describe, expect, it } from "vitest";
import { billDraftResponseSchema } from "@splithouse/shared";
import { BILL_FIXTURE } from "../fixtures/bill";
import { isPdf } from "./bill-file-store";
import { buildBillDraftResponse } from "./build-bill-draft";

describe("buildBillDraftResponse", () => {
  it("passes a clean read through and writes the file line", () => {
    const response = buildBillDraftResponse({
      month: "2026-11",
      filename: "Utilities_Bill_Nov2026.pdf",
      sizeBytes: 219_136,
      pageCount: 2,
      parsed: BILL_FIXTURE,
    });
    expect(billDraftResponseSchema.parse(response)).toEqual({
      month: "2026-11",
      file: { filename: "Utilities_Bill_Nov2026.pdf", meta: "2 pages · 214 KB" },
      readOk: true,
      fields: {
        currentChargesCents: 38150,
        billMonth: "2026-11",
        dueDate: "2026-11-16",
        billingPeriodStart: "2026-10-01",
        billingPeriodEnd: "2026-10-31",
        lines: BILL_FIXTURE.lines,
      },
    });
  });

  it("gives empty fields for an unreadable bill", () => {
    const response = buildBillDraftResponse({
      month: "2026-11",
      filename: "scan.pdf",
      sizeBytes: 2048,
      pageCount: null,
      parsed: null,
    });
    expect(response.readOk).toBe(false);
    expect(response.file.meta).toBe("2 KB");
    expect(response.fields).toEqual({
      currentChargesCents: null,
      billMonth: null,
      dueDate: null,
      billingPeriodStart: null,
      billingPeriodEnd: null,
      lines: [],
    });
  });
});

describe("isPdf", () => {
  it.each([
    ["%PDF-1.7\n", true],
    ["%PDF", false],
    ["PK\u0003\u0004", false],
    ["", false],
  ])("%j -> %s", (text, expected) => {
    expect(isPdf(new TextEncoder().encode(text))).toBe(expected);
  });
});
