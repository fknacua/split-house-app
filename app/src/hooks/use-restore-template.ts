import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { TemplateKind, TemplateSaveResponse } from '@splithouse/shared';

/**
 * Saves the built-in text as the Default (`POST /api/templates/:kind/restore`), which applies immediately. Settings,
 * the landing page and the editor sit under `allHousehold`, and Recipient shows the wording, so all are refetched; the
 * mutation stays pending until they are, so the editor reloads on the restored text.
 */
export function useRestoreTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kind: TemplateKind) =>
      apiFetch<TemplateSaveResponse>(`/api/templates/${kind}/restore`, { method: 'POST' }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.allHousehold }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allRecipients }),
      ]),
  });
}
