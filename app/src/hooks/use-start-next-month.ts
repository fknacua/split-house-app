import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiRequestError, apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { StartNextMonthResponse } from '@splithouse/shared';

/**
 * Starts the next month early (`POST /api/home/start-next-month`). Once it succeeds the active
 * month has moved on, so Home, History and bootstrap are refetched; the mutation stays pending
 * until they are, so the Close dialog keeps its spinner until Home shows the new month. A 409 means
 * Home is out of date (the month was already started, or is not settled), so Home is refetched.
 */
export function useStartNextMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<StartNextMonthResponse>('/api/home/start-next-month', { method: 'POST' }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.history }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap }),
      ]),
    onError: (error) =>
      error instanceof ApiRequestError
        ? queryClient.invalidateQueries({ queryKey: queryKeys.home })
        : undefined,
  });
}
