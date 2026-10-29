import { formatCents, type BillLine, type BillLinesNote } from "@splithouse/shared";

/**
 * The warning under the lines: some have no amount, or they do not add up to the bill's Subtotal
 * (the charges before GST). Only a warning, never a blocker, because the split uses Current Charges
 * either way (the lines are shown on View bill). Lines that match get no note. A line with no
 * amount is the note, and the sum is not compared until every line has one. Pure.
 *
 * @param subtotalCents - The Subtotal read from the bill, or `null` when it was not found.
 * @param lines - The lines as typed.
 * @returns The warning, or `null` when the lines match or there is nothing to compare: no lines,
 * or every line has an amount and there is no Subtotal.
 */
export function buildLinesNote(subtotalCents: number | null, lines: BillLine[]): BillLinesNote | null {
  if (lines.length === 0) return null;

  const missing = lines.filter((line) => line.cents === null).length;
  if (missing > 0) {
    return {
      title: `${missing} ${missing === 1 ? "line" : "lines"} not found`,
      message: "Fill them in or leave them empty. You can still save; the split uses Current Charges.",
    };
  }

  if (subtotalCents === null) return null;
  const total = lines.reduce((sum, line) => sum + (line.cents ?? 0), 0);
  if (total === subtotalCents) return null;

  const difference = formatCents(Math.abs(subtotalCents - total));
  const direction = total < subtotalCents ? "less" : "more";
  return {
    title: "Lines don’t add up to the Subtotal",
    message: `Lines total ${formatCents(total)}, which is ${difference} ${direction} than the Subtotal. You can still save; the split uses Current Charges.`,
  };
}
