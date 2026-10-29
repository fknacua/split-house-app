import { describe, expect, it } from "vitest";
import {
  BILL_FIXTURE,
  BILL_FIXTURE_PARTIAL,
  BILL_FIXTURE_PARTIAL_PAGES,
  BILL_FIXTURE_UNREADABLE_PAGES,
} from "../../lib/fixtures/bill";
import { generateBillFixturePdf } from "../../lib/fixtures/generate-bill-pdf";
import { countPdfPages, readBill } from "./read-bill.service";

describe("readBill", () => {
  it("reads the synthetic bill fixture PDF with unpdf and parses it", async () => {
    const bytes = await generateBillFixturePdf();
    expect(await readBill(bytes)).toEqual({ pageCount: 2, parsed: BILL_FIXTURE });
  });

  it("keeps a service whose amount is missing on the bill as a line with no amount", async () => {
    const bytes = await generateBillFixturePdf(BILL_FIXTURE_PARTIAL_PAGES);
    expect(await readBill(bytes)).toEqual({ pageCount: 2, parsed: BILL_FIXTURE_PARTIAL });
  });

  it("returns no fields for a PDF with no readable Current Charges", async () => {
    const bytes = await generateBillFixturePdf(BILL_FIXTURE_UNREADABLE_PAGES);
    expect(await readBill(bytes)).toEqual({ pageCount: 1, parsed: null });
  });

  it("treats a file that only starts like a PDF as unreadable", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.4\n% not really a PDF\n%%EOF\n");
    expect(await readBill(bytes)).toEqual({ pageCount: null, parsed: null });
    expect(await countPdfPages(bytes)).toBeNull();
  });
});
