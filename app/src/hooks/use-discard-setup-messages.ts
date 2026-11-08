import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { SetupSaveResponse } from '@splithouse/shared';

/**
 * Discards every custom template and un-marks Custom messages (`POST /api/setup/messages/discard`), from the
 * `skipMessages` dialog. Welcome shows the step, and the template screens and Recipient show the wording, so all are
 * refetched; the mutation stays pending until they are.
 */
export function useDiscardSetupMessages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<SetupSaveResponse>('/api/setup/messages/discard', { method: 'POST' }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.setup }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allHousehold }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allRecipients }),
      ]),
  });
}
