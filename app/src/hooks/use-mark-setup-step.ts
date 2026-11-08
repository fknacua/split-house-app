import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { SetupMarkableStep, SetupSaveResponse } from '@splithouse/shared';

/**
 * Marks a First run step done from its page's Save (`POST /api/setup/steps/:id`): People or Custom messages. Welcome
 * shows the step, so it is refetched; the mutation stays pending until it is, so Save keeps its spinner until Welcome
 * is up to date.
 */
export function useMarkSetupStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (step: SetupMarkableStep) =>
      apiFetch<SetupSaveResponse>(`/api/setup/steps/${step}`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.setup }),
  });
}
