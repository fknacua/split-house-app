import { formatCents, type BillLine, type BillLinesNote } from "@splithouse/shared";

/**
 * The warning under the lines when they do not add up to the bill's Subtotal (the charges before
 * GST). Only a warning, never a blocker, because the split uses Current Charges either way (the lines
 * are shown on View bill). Lines that match get no note. Pure.
 *
 * @param subtotalCents - The Subtotal read from the bill, or `null` when it was not found.
 * @param lines - The lines as typed.
 * @returns The warning, or `null` when the lines match or there is nothing to compare: no Subtotal,
 * no lines, or a line still has no amount (the missing-amount note covers that).
 */
export function buildLinesNote(subtotalCents: number | null, lines: BillLine[]): BillLinesNote | null {
  if (subtotalCents === null || lines.length === 0) return null;
  const amounts = lines.map((line) => line.cents);
  if (amounts.some((cents) => cents === null)) return null;

  const total = amounts.reduce<number>((sum, cents) => sum + (cents ?? 0), 0);
  if (total === subtotalCents) return null;

  const difference = formatCents(Math.abs(subtotalCents - total));
  const direction = total < subtotalCents ? "less" : "more";
  return {
    title: "Lines don’t add up to the Subtotal",
    message: `Lines total ${formatCents(total)}, which is ${difference} ${direction} than the Subtotal. You can still save; the split uses Current Charges.`,
  };
}
