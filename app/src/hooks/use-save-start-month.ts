import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { SetupSaveResponse, SetupStartMonthRequest } from '@splithouse/shared';

/**
 * Saves First run's start month (`POST /api/setup/start-month`), which marks Step 1 and moves the first version's
 * start when one exists. Welcome shows the step and the editors show the month in their `From {month}` heading, so
 * both are refetched; the mutation stays pending until they are, so Save keeps its spinner until Welcome is up to date.
 */
export function useSaveStartMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (save: SetupStartMonthRequest) =>
      apiFetch<SetupSaveResponse>('/api/setup/start-month', { method: 'POST', body: save }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.setup }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allHousehold }),
      ]),
  });
}
