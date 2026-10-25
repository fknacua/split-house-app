import type { HomeTarget } from '@splithouse/shared';

/**
 * Opens what a row link, a row button or the footer points at. The screens do not exist yet, so
 * a tap does nothing; each case is filled in by the phase that builds its screen.
 *
 * @param target - Where the server says the tap goes.
 */
export function openTarget(target: HomeTarget): void {
  switch (target.kind) {
    case 'recipient': // Phase 7B
    case 'mark-paid': // Phase 7A
    case 'record-payment': // Phase 7A
    case 'mark-bill-paid': // Phase 6C
    case 'bill-upload': // Phase 6B
    case 'bill-draft-continue': // Phase 6B
    case 'bill-draft-discard': // Phase 6B
    case 'bill-view': // Phase 6C
      return;
  }
}
