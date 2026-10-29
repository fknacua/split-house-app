import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { BillDraftResponse } from '@splithouse/shared';

/**
 * Loads the month's stored bill draft (`GET /api/months/:month/bill-draft`) when called, for
 * Home's Continue: the file and the values read from it. Edits made before leaving are not stored.
 * Always fetched fresh and never kept, since the draft can be replaced or discarded from Home.
 * Reads retry an unreachable server as every query does.
 *
 * @param month `YYYY-MM`, the month the upload started from.
 * @returns A stable function resolving to the draft. It rejects when the request fails (an
 *   `ApiRequestError` 404 `no_draft` when the month has none).
 */
export function useLoadBillDraft(month: string) {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      queryClient.query({
        queryKey: queryKeys.billDraft(month),
        queryFn: () => apiFetch<BillDraftResponse>(`/api/months/${month}/bill-draft`),
        staleTime: 0,
        gcTime: 0,
      }),
    [queryClient, month],
  );
}
