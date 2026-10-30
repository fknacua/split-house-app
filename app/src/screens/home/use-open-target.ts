import { useIsMutating } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useDiscardBillDraft } from '@/hooks';
import { queryKeys } from '@/lib';
import { useHomeSheets } from './home-sheets';
import type { HomeTarget } from '@splithouse/shared';

/**
 * How Home opens what a row link, a row button or the footer points at. Most targets open a
 * screen; Mark bill paid, Mark paid and Record payment open Home's sheets (`HomeSheetsProvider`); Discard runs at once.
 * Targets whose screen does not exist yet do nothing; each case is filled in by the phase that
 * builds its screen.
 *
 * @returns `openTarget`, which opens a target; `pending`, true while an action this caller started
 *   (Discard on the draft notice) is still running, for its button's Spinner; and `isDisabled`, true for a target
 *   that must not be opened right now (Continue while the draft is being discarded).
 */
export function useOpenTarget() {
  const discardDraft = useDiscardBillDraft();
  const { openPayBill, openMarkPaid, openRecordPayment } = useHomeSheets();
  const discarding = useIsMutating({ mutationKey: queryKeys.billDraftDiscard }) > 0;

  const isDisabled = (target: HomeTarget): boolean => target.kind === 'bill-draft-continue' && discarding;

  const openTarget = (target: HomeTarget): void => {
    if (isDisabled(target)) return;
    switch (target.kind) {
      case 'bill-upload':
        router.push({ pathname: '/bill/[month]/upload', params: { month: target.month } });
        return;
      case 'bill-draft-continue':
        router.push({ pathname: '/bill/[month]/upload', params: { month: target.month, draft: 'stored' } });
        return;
      case 'bill-view':
        router.push({ pathname: '/bill/[month]', params: { month: target.month } });
        return;
      case 'mark-bill-paid':
        openPayBill(target.month);
        return;
      case 'bill-draft-discard':
        if (!discardDraft.isPending) discardDraft.mutate(target.month);
        return;
      case 'mark-paid':
        openMarkPaid(target.chargeId);
        return;
      case 'record-payment':
        openRecordPayment(target.month);
        return;
      case 'recipient': // Phase 7
        return;
    }
  };

  return { openTarget, pending: discardDraft.isPending, isDisabled };
}
