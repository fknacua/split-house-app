import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { SetupFinishResponse } from '@splithouse/shared';

/**
 * Finishes First run (`POST /api/setup/finish`), which opens the start month. Every query but Welcome's is then
 * refetched: the bootstrap's `setupComplete` turns on, so the session gate swaps Welcome for the tabs and Home opens,
 * and the Household and template screens now read an open month. Welcome's queries are left alone, since
 * `GET /api/setup` answers 409 once a month is open. The mutation stays pending until the refetch is done, so the
 * button keeps its spinner until the gate moves on.
 */
export function useFinishSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<SetupFinishResponse>('/api/setup/finish', { method: 'POST' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.setup[0] }),
  });
}
