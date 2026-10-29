import { router } from 'expo-router';

import type { HomeTarget } from '@splithouse/shared';

/**
 * Opens what a row link, a row button or the footer points at. Targets whose screen does not exist
 * yet do nothing; each case is filled in by the phase that builds its screen.
 *
 * @param target - Where the server says the tap goes.
 */
export function openTarget(target: HomeTarget): void {
  switch (target.kind) {
    case 'bill-upload':
      router.push({ pathname: '/bill/[month]/upload', params: { month: target.month } });
      return;
    case 'recipient': // Phase 7B
    case 'mark-paid': // Phase 7A
    case 'record-payment': // Phase 7A
    case 'mark-bill-paid': // 6.8
    case 'bill-draft-continue': // 6.4
    case 'bill-draft-discard': // 6.4
    case 'bill-view': // 6.6
      return;
  }
}
