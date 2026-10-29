import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { MarkBillPaidRequest, MarkBillPaidResponse } from '@splithouse/shared';

/**
 * Records that the user paid the month's utilities bill (`POST /api/months/:month/bill/paid`).
 * Home, History and the bill show it, so all three are refetched; the mutation stays pending until
 * they are, so the sheet keeps its spinner until the screens behind it are up to date.
 *
 * @param month `YYYY-MM` key.
 */
export function useMarkBillPaid(month: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: MarkBillPaidRequest) =>
      apiFetch<MarkBillPaidResponse>(`/api/months/${month}/bill/paid`, { method: 'POST', body: values }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.history }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bill(month) }),
      ]),
  });
}
