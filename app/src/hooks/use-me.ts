import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import type { MeResponse } from '@splithouse/shared';
import { queryKeys } from '@/lib';

/** The signed-in account (`GET /api/me`). */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiFetch<MeResponse>('/api/me'),
  });
}
