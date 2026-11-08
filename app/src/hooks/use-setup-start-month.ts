import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { SetupStartMonthResponse } from '@splithouse/shared';

/**
 * First run's Start month page: the three cards, the card selected on open and the picker's first month, worked
 * out from today by the server (`GET /api/setup/start-month`). Nothing is kept once the page closes, so it never
 * opens on an old month.
 */
export function useSetupStartMonth() {
  return useQuery({
    queryKey: queryKeys.setupStartMonth,
    queryFn: () => apiFetch<SetupStartMonthResponse>('/api/setup/start-month'),
    gcTime: 0,
  });
}
