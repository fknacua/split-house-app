/** Shares and split units are stored in thousandths. */
export const SHARE_SCALE = 1000;

/**
 * A count in thousandths, as a plain number.
 *
 * @param thousandths - The stored count.
 * @returns e.g. `1.5`, `2`.
 */
export function amountText(thousandths: number): string {
  return String(Number((thousandths / SHARE_SCALE).toFixed(3)));
}

/**
 * A count in thousandths with its word.
 *
 * @param thousandths - The stored count.
 * @param word - The singular word, e.g. `share`.
 * @returns e.g. `1 share`, `1.5 shares`.
 */
export function countText(thousandths: number, word: string): string {
  return `${amountText(thousandths)} ${thousandths === SHARE_SCALE ? word : `${word}s`}`;
}
