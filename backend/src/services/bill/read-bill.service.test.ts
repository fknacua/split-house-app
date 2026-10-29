import { describe, expect, it } from "vitest";
import { BILL_FIXTURE } from "../../lib/fixtures/bill";
import { generateBillFixturePdf } from "../../lib/fixtures/generate-bill-pdf";
import { countPdfPages, readBill } from "./read-bill.service";

describe("readBill", () => {
  it("reads the synthetic bill fixture PDF with unpdf and parses it", async () => {
    const bytes = await generateBillFixturePdf();
    expect(await readBill(bytes)).toEqual({ pageCount: 2, parsed: BILL_FIXTURE });
  });

  it("returns no fields for a PDF with no readable Current Charges", async () => {
    const { PDFDocument, StandardFonts } = await import("pdf-lib");
    const document = await PDFDocument.create();
    const font = await document.embedFont(StandardFonts.Helvetica);
    const page = document.addPage([595, 842]);
    page.drawText("Not a bill", { x: 50, y: 800, size: 12, font });
    const bytes = await document.save();

    expect(await readBill(bytes)).toEqual({ pageCount: 1, parsed: null });
  });

  it("treats a file that only starts like a PDF as unreadable", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.4\n% not really a PDF\n%%EOF\n");
    expect(await readBill(bytes)).toEqual({ pageCount: null, parsed: null });
    expect(await countPdfPages(bytes)).toBeNull();
  });
});
