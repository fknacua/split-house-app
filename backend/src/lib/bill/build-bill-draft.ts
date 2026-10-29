import { formatBillFileMeta, type BillDraftResponse } from "@splithouse/shared";
import type { ParsedBill } from "./bill-parser";

/** What {@link buildBillDraftResponse} needs about one stored draft. */
export interface BillDraftInput {
  month: string;
  filename: string;
  sizeBytes: number;
  /** `null` when the PDF could not be opened. */
  pageCount: number | null;
  /** What the parser read, or `null` for an unreadable bill. */
  parsed: ParsedBill | null;
}

/**
 * Turns a stored draft into what the Review bill screen shows: the file card's text and the
 * values read from the PDF. An unreadable bill gives empty fields and `readOk: false`.
 *
 * @param input The draft's file facts and parser output.
 * @returns The `bill-draft` response.
 */
export function buildBillDraftResponse(input: BillDraftInput): BillDraftResponse {
  const { parsed } = input;
  return {
    month: input.month,
    file: { filename: input.filename, meta: formatBillFileMeta(input.sizeBytes, input.pageCount) },
    readOk: parsed !== null,
    fields: {
      currentChargesCents: parsed?.currentChargesCents ?? null,
      billMonth: parsed?.billMonth ?? null,
      dueDate: parsed?.dueDate ?? null,
      billingPeriodStart: parsed?.billingPeriodStart ?? null,
      billingPeriodEnd: parsed?.billingPeriodEnd ?? null,
      // Drafts stored before the Subtotal was read have no such key.
      subtotalCents: parsed?.subtotalCents ?? null,
      lines: parsed?.lines ?? [],
    },
  };
}
