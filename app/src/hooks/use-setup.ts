import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { SetupResponse } from '@splithouse/shared';

/** Welcome: the heading, progress, step rows and footer actions, with the text already written (`GET /api/setup`). */
export function useSetup() {
  return useQuery({
    queryKey: queryKeys.setup,
    queryFn: () => apiFetch<SetupResponse>('/api/setup'),
  });
}
