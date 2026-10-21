import { useQuery } from '@tanstack/react-query';

import type { MonthSummaryResponse } from '@/lib/api-types';
import { queryKeys } from '@/lib/query-keys';

/**
 * Home's data for one month. MOCK until step 5.1 builds the endpoint: the
 * query function resolves a canned value instead of calling the backend.
 *
 * Real call, once `GET /api/months/:month/summary` exists:
 * `apiFetch<MonthSummaryResponse>(`/api/months/${month}/summary`)`
 * (the backend runs `openMonthIfNeeded`, then returns the derived status,
 * hero totals, per-person rows, alerts and draft info).
 *
 * @param month `YYYY-MM` key.
 */
export function useMonthSummary(month: string) {
  return useQuery({
    queryKey: queryKeys.monthSummary(month),
    queryFn: (): Promise<MonthSummaryResponse> =>
      Promise.resolve({ month, status: 'bill_missing' }),
  });
}
