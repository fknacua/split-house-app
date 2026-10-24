import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { HistoryMonthResponse } from '@splithouse/shared';

/**
 * One past month on History: banners, bill card and payment rows, with the text already written
 * (`GET /api/history/:month`).
 *
 * @param month `YYYY-MM` key.
 */
export function useHistoryMonth(month: string) {
  return useQuery({
    queryKey: queryKeys.historyMonth(month),
    queryFn: () => apiFetch<HistoryMonthResponse>(`/api/history/${month}`),
  });
}
