/**
 * Helpers for typing utility shares. Shares are stored as thousandths, so `1.5` shares is `1500`. Only
 * the input control uses these, so they stay in the app.
 */

/** Thousandths in one share. */
const PER_SHARE = 1000;
/** How many decimals a share can have. */
const SHARE_DECIMALS = 3;

/**
 * Cleans text typed or pasted into a shares input: keeps digits and one decimal point, with at most 3
 * decimals. Partial text such as `1.` is kept so typing is not interrupted.
 *
 * @param text The raw text from the input.
 * @returns The cleaned text.
 */
export function sanitizeShareInput(text: string): string {
  const stripped = text.replace(/[^\d.]/g, '');
  const point = stripped.indexOf('.');
  if (point === -1) return stripped;
  const decimals = stripped.slice(point + 1).replace(/\./g, '').slice(0, SHARE_DECIMALS);
  return `${stripped.slice(0, point)}.${decimals}`;
}

/**
 * Reads cleaned shares text as thousandths, e.g. `1.5` -> `1500`.
 *
 * @param text Text from {@link sanitizeShareInput}.
 * @returns The thousandths, or `null` while the text has no digits.
 */
export function parseShareInput(text: string): number | null {
  if (!/\d/.test(text)) return null;
  const [whole = '', decimals = ''] = text.split('.');
  return Number(whole || '0') * PER_SHARE + Number(decimals.padEnd(SHARE_DECIMALS, '0'));
}

/**
 * Renders thousandths as plain editable text with no trailing zeros, e.g. `1500` -> `1.5`, `1000` -> `1`.
 *
 * @param thousandths The shares in thousandths.
 * @returns The text.
 */
export function sharesToInputText(thousandths: number): string {
  const whole = Math.floor(thousandths / PER_SHARE);
  const decimals = String(thousandths % PER_SHARE).padStart(SHARE_DECIMALS, '0').replace(/0+$/, '');
  return decimals ? `${whole}.${decimals}` : String(whole);
}
