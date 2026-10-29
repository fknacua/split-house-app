import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BILL_FIXTURE_PARTIAL_PAGES, BILL_FIXTURE_UNREADABLE_PAGES } from "../src/lib/fixtures/bill.js";
import { generateBillFixturePdf } from "../src/lib/fixtures/generate-bill-pdf.js";

/**
 * Writes the synthetic bill fixtures to `src/lib/fixtures/` (gitignored, on demand only): the PDFs
 * to put on your phone for device upload testing. `bill.pdf` reads cleanly; `bill-partial.pdf` has
 * no Water amount, to see the "line not found" state; `bill-unreadable.pdf` is a letter with no
 * Current Charges, to see "Is this the right bill?". Tests generate the same bytes directly from
 * `generateBillFixturePdf()` and don't need these files to exist.
 */
async function main() {
  const files = [
    { name: "bill.pdf", bytes: await generateBillFixturePdf() },
    { name: "bill-partial.pdf", bytes: await generateBillFixturePdf(BILL_FIXTURE_PARTIAL_PAGES) },
    { name: "bill-unreadable.pdf", bytes: await generateBillFixturePdf(BILL_FIXTURE_UNREADABLE_PAGES) },
  ];
  for (const { name, bytes } of files) {
    const outPath = fileURLToPath(new URL(`../src/lib/fixtures/${name}`, import.meta.url));
    await writeFile(outPath, bytes);
    console.log(`Wrote ${outPath} (${bytes.byteLength} bytes)`);
  }
}

main();
