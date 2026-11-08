import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { SetupSaveResponse, SetupSkippableStep } from '@splithouse/shared';

/**
 * Skips an optional First run step with `Not now` (`POST /api/setup/steps/:id/skip`), on Welcome or on the step's page.
 * The step counts as done, so Welcome moves to the next step; it is refetched, and the mutation stays pending until it
 * is, so `Not now` keeps its spinner until Welcome is up to date.
 */
export function useSkipSetupStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (step: SetupSkippableStep) =>
      apiFetch<SetupSaveResponse>(`/api/setup/steps/${step}/skip`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.setup }),
  });
}
