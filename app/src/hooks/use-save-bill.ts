import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { SaveBillRequest, SaveBillResponse } from '@splithouse/shared';

/**
 * Saves the month's bill from its draft (`POST /api/months/:month/bill`). The month moves to
 * `unsent`, so Home and History are refetched; the mutation stays pending until they are, so Save
 * keeps its spinner until Home shows the saved bill.
 *
 * @param month `YYYY-MM`, the month the upload started from.
 */
export function useSaveBill(month: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: SaveBillRequest) =>
      apiFetch<SaveBillResponse>(`/api/months/${month}/bill`, { method: 'POST', body: values }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.history }),
      ]),
  });
}
