import { PDFDocument, StandardFonts } from "pdf-lib";
import { BILL_FIXTURE_PAGES } from "./bill";

/**
 * Builds a synthetic bill fixture's PDF bytes, one A4 page per array of text lines. Pure in effect
 * (no filesystem access): the CLI script writes the result to disk for device testing, and
 * `read-bill.service.test.ts` reads the bytes straight from this instead, so no generated PDF needs
 * to be committed.
 *
 * @param pages - The lines of text for each page. Defaults to {@link BILL_FIXTURE_PAGES}.
 */
export async function generateBillFixturePdf(pages: string[][] = BILL_FIXTURE_PAGES): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);

  const fontSize = 12;
  const lineHeight = 20;
  for (const lines of pages) {
    const page = document.addPage([595, 842]); // A4
    let y = 800;
    for (const line of lines) {
      page.drawText(line, { x: 50, y, size: fontSize, font });
      y -= lineHeight;
    }
  }

  return document.save();
}
