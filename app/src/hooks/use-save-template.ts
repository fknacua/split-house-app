import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { TemplateSaveRequest, TemplateSaveResponse } from '@splithouse/shared';

/**
 * Saves the Default's text or one person's custom template (`POST /api/templates`), which applies immediately.
 * Settings and the editor sit under `allHousehold`, and Recipient shows the wording, so all are refetched; the mutation
 * stays pending until they are, so Save keeps its spinner until the screens behind it are up to date.
 */
export function useSaveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (save: TemplateSaveRequest) =>
      apiFetch<TemplateSaveResponse>('/api/templates', { method: 'POST', body: save }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.allHousehold }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allRecipients }),
      ]),
  });
}
