import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { HistoryListResponse } from '@splithouse/shared';

/** The History list: past months grouped by year, with the text already written (`GET /api/history`). */
export function useHistory() {
  return useQuery({
    queryKey: queryKeys.history,
    queryFn: () => apiFetch<HistoryListResponse>('/api/history'),
  });
}
