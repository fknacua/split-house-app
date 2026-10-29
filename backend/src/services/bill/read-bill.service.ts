import { extractText, getDocumentProxy } from "unpdf";
import { parseBillText, type ParsedBill } from "../../lib/bill/bill-parser";
import { utilBillParser } from "../../lib/bill/util-bill-parser";

const PARSERS = [utilBillParser];

/**
 * Turns a bill's PDF bytes into text with `unpdf`, then reads it with the known bill parsers.
 *
 * @returns The parsed fields, or `null` when the PDF has no readable Current Charges.
 */
export async function readBill(bytes: Uint8Array): Promise<ParsedBill | null> {
  // unpdf rejects a `Buffer` (a Uint8Array subclass) outright, so callers passing one
  // (e.g. from `fs.readFile`) need this normalised to a plain Uint8Array first.
  const document = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(document, { mergePages: true });
  return parseBillText(text, PARSERS);
}
