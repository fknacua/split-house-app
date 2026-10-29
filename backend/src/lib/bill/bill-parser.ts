/** One best-effort line read from a bill, e.g. `{ label: "Electricity", cents: 28150 }`. */
export type ParsedBillLine = {
  label: string;
  cents: number;
};

/**
 * The fields a {@link BillParser} reads from a bill's text. `currentChargesCents` is the
 * only field the split engine uses, so a read that finds every other field but not this one
 * still counts as failed (the parser returns `null`, not a `ParsedBill` with a zero amount).
 * Every other field is best-effort and `null` when not found.
 */
export type ParsedBill = {
  currentChargesCents: number;
  /** `YYYY-MM-DD`, or `null` when not found. */
  billingPeriodStart: string | null;
  /** `YYYY-MM-DD`, or `null` when not found. */
  billingPeriodEnd: string | null;
  /**
   * `YYYY-MM`, read from a bill month the bill prints of its own (e.g. `October 2026 Bill`).
   * `null` when the bill has no such heading; the Review bill screen's default is then
   * derived from `billingPeriodEnd` by the bill service (the matching rule is decided in
   * step 6.3), not by the parser.
   */
  billMonth: string | null;
  /** `YYYY-MM-DD`, or `null` when not found. */
  dueDate: string | null;
  /** The bill's Subtotal (the charges before GST), or `null` when not found. The lines should add up to it. */
  subtotalCents: number | null;
  lines: ParsedBillLine[];
};

/** Reads one bill layout: text in, fields out, or `null` on an unreadable bill. */
export interface BillParser {
  parse(text: string): ParsedBill | null;
}

/**
 * Tries each parser in turn and returns the first successful read.
 *
 * @param text Plain text already extracted from the bill's PDF.
 * @param parsers Providers to try, in order.
 * @returns The first non-null read, or `null` when no parser can read the bill.
 */
export function parseBillText(text: string, parsers: readonly BillParser[]): ParsedBill | null {
  for (const parser of parsers) {
    const parsed = parser.parse(text);
    if (parsed) return parsed;
  }
  return null;
}
