import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import type { BootstrapResponse } from '@splithouse/shared';
import { queryKeys } from '@/lib';

/**
 * What the app needs right after sign-in and on launch (`GET /api/bootstrap`).
 *
 * @param options.enabled - Set false to fetch only on demand through `refetch`. Defaults to true.
 */
export function useBootstrap({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.bootstrap,
    queryFn: () => apiFetch<BootstrapResponse>('/api/bootstrap'),
    enabled,
  });
}
