import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { generateBillFixturePdf } from "../src/lib/fixtures/generate-bill-pdf.js";

/**
 * Writes the synthetic bill fixture to `src/lib/fixtures/bill.pdf` (gitignored, on demand
 * only): the PDF to put on your phone for device upload testing. Tests generate the same
 * bytes directly from `generateBillFixturePdf()` and don't need this file to exist.
 */
async function main() {
  const bytes = await generateBillFixturePdf();
  const outPath = fileURLToPath(new URL("../src/lib/fixtures/bill.pdf", import.meta.url));
  await writeFile(outPath, bytes);
  console.log(`Wrote ${outPath} (${bytes.byteLength} bytes)`);
}

main();
