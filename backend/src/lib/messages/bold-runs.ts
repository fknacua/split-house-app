import type { MessageRun } from "@splithouse/shared";

// WhatsApp's bold: a `*` not after a letter or digit, then text with no `*` that starts and ends with a non-space,
// then a `*` not before a letter or digit, all on one line.
const BOLD = /(?<![\p{L}\p{N}*])\*([^*\s](?:[^*\n]*?[^*\s])?)\*(?![\p{L}\p{N}*])/gu;

/**
 * Splits message text into bold and plain pieces the way WhatsApp reads its `*bold*` markers, leaving the markers
 * out. A `*` that WhatsApp would show as typed stays in the text.
 *
 * @param text - Filled template text, e.g. `*Total:* $1,963.65`.
 * @returns The pieces in order, with neighbours of the same weight joined; empty for empty text.
 */
export function boldRuns(text: string): MessageRun[] {
  const runs: MessageRun[] = [];
  const push = (piece: string, bold: boolean) => {
    if (!piece) return;
    const last = runs.at(-1);
    if (last && last.bold === bold) last.text += piece;
    else runs.push({ text: piece, bold });
  };
  let from = 0;
  for (const match of text.matchAll(BOLD)) {
    push(text.slice(from, match.index), false);
    push(match[1], true);
    from = match.index + match[0].length;
  }
  push(text.slice(from), false);
  return runs;
}
