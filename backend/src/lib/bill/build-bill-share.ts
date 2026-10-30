import {
  formatBillFileMeta,
  formatCents,
  formatDateMedium,
  formatMonthLabel,
  formatMonthShortLabel,
  type BillShare,
  type BillShareLine,
  type BillViewLine,
} from "@splithouse/shared";

/** Everything `buildBillShare` works from, already in display order. */
export interface BillShareInput {
  month: string;
  currentChargesCents: number;
  /** The bill's due date key, or null when none is known. */
  dueDate: string | null;
  /** The bill's lines as display text, as on View bill. */
  lines: BillViewLine[];
  /** The stored PDF, or null without one. */
  file: { filename: string; sizeBytes: number; pageCount: number | null } | null;
  /** Each person's utilities share, the user first and by name: the summary goes to someone else. */
  shares: { name: string; amountCents: number }[];
}

/** The preview lines with the plain text that is shared. */
function summary(lines: BillShareLine[]): BillShare["summary"] {
  return { lines, text: lines.map((l) => l.text).join("\n") };
}

/**
 * Builds the Share bill sheet's text: its title, the stored PDF's row, and the summary with and
 * without each person's share. The summary is plain text for any app, so it has no WhatsApp
 * markers; its due line has no weekday and is left out when no due date is known, and its
 * `Charges:` list (one bulleted line per bill line, as the shares) is left out when the bill was
 * saved with no lines.
 *
 * @param input - The month, the bill's amount, due date, lines and file, and the shares.
 * @returns The share block of the bill response.
 */
export function buildBillShare(input: BillShareInput): BillShare {
  const lines: BillShareLine[] = [
    { text: `Utilities bill · ${formatMonthShortLabel(input.month)}`, tone: "title" },
    { text: `Current Charges: ${formatCents(input.currentChargesCents)}`, tone: "body" },
  ];
  if (input.dueDate) lines.push({ text: `Due: ${formatDateMedium(input.dueDate)}`, tone: "body" });
  // One item per line, bulleted, here and in the shares: as one sentence they were hard to read (7.10 review).
  if (input.lines.length > 0) {
    lines.push({ text: "Charges:", tone: "muted" });
    for (const l of input.lines) lines.push({ text: `• ${l.label} ${l.amount}`, tone: "muted" });
  }
  const sharesLines: BillShareLine[] = [
    { text: "Shares:", tone: "muted" },
    ...input.shares.map((s): BillShareLine => ({ text: `• ${s.name} ${formatCents(s.amountCents)}`, tone: "muted" })),
  ];

  return {
    title: `Utilities bill · ${formatMonthLabel(input.month)}`,
    // The same meta as Bill upload's file card, which the sheet reuses.
    file: input.file && {
      filename: input.file.filename,
      meta: formatBillFileMeta(input.file.sizeBytes, input.file.pageCount),
    },
    summary: summary(lines),
    summaryWithShares: summary([...lines, ...sharesLines]),
  };
}
