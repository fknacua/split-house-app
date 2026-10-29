import { extractText, getDocumentProxy } from "unpdf";
import { parseBillText, type ParsedBill } from "../../lib/bill/bill-parser";
import { utilBillParser } from "../../lib/bill/util-bill-parser";

const PARSERS = [utilBillParser];

/** What {@link readBill} found in a PDF. */
export interface BillRead {
  /** The PDF's page count, or `null` when the file could not be opened as a PDF. */
  pageCount: number | null;
  /** The parsed fields, or `null` when the PDF has no readable Current Charges. */
  parsed: ParsedBill | null;
}

/**
 * Turns a bill's PDF bytes into text with `unpdf`, then reads it with the known bill parsers.
 * A file that starts like a PDF but cannot be opened counts as an unreadable bill, not an error.
 *
 * @returns The page count and the parsed fields; see {@link BillRead}.
 */
export async function readBill(bytes: Uint8Array): Promise<BillRead> {
  let document;
  try {
    // unpdf rejects a `Buffer` (a Uint8Array subclass) outright, so callers passing one
    // (e.g. from `fs.readFile`) need this normalised to a plain Uint8Array first.
    document = await getDocumentProxy(new Uint8Array(bytes));
  } catch {
    return { pageCount: null, parsed: null };
  }
  const { text } = await extractText(document, { mergePages: true });
  return { pageCount: document.numPages, parsed: parseBillText(text, PARSERS) };
}

/**
 * Counts a PDF's pages, for the line under the file name.
 *
 * @returns The page count, or `null` when the file cannot be opened as a PDF.
 */
export async function countPdfPages(bytes: Uint8Array): Promise<number | null> {
  try {
    return (await getDocumentProxy(new Uint8Array(bytes))).numPages;
  } catch {
    return null;
  }
}
