import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { HomeResponse } from '@splithouse/shared';

/** Home: the newest opened month with the text already written (`GET /api/home`). */
export function useHome() {
  return useQuery({
    queryKey: queryKeys.home,
    queryFn: () => apiFetch<HomeResponse>('/api/home'),
  });
}
