import { formatMonthLabel, type SetupStartMonthOption } from '@splithouse/shared';

import type { StartMonthChoice } from './types';

/**
 * The month Save sends for the selected card.
 *
 * @param options The page's three cards.
 * @param choice The selected card.
 * @param otherMonth The month picked for Another month, or null before one is picked.
 * @returns The `YYYY-MM` key, or null when the card has no month yet.
 */
export function startMonthFor(
  options: SetupStartMonthOption[],
  choice: StartMonthChoice,
  otherMonth: string | null,
): string | null {
  if (choice === 'other') return otherMonth;
  return options.find((option) => option.id === choice)?.month ?? null;
}

/**
 * The info Alert under the cards when Another month is chosen. The app writes it from the picked month, with no
 * round trip to the server (Francis, 2026-11-07).
 *
 * @param month The picked `YYYY-MM` key.
 * @returns e.g. `That’s a long wait. Are you sure you want to start in January 2027?`
 */
export function farAheadNote(month: string): string {
  return `That’s a long wait. Are you sure you want to start in ${formatMonthLabel(month)}?`;
}
