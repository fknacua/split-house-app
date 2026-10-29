import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { DiscardBillDraftResponse } from '@splithouse/shared';

/**
 * Discards a month's bill draft (`POST /api/months/:month/bill-draft/discard`), taking the month
 * when called, since Home's Discard carries it in its target. Home shows the draft, so it is
 * refetched; the mutation stays pending until it is.
 */
export function useDiscardBillDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: queryKeys.billDraftDiscard,
    mutationFn: (month: string) =>
      apiFetch<DiscardBillDraftResponse>(`/api/months/${month}/bill-draft/discard`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.home }),
  });
}
