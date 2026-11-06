import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { TemplateKind, TemplateSaveResponse } from '@splithouse/shared';

/**
 * Removes one person's custom template (`DELETE /api/templates/:kind`), so they get the Default from now on. Settings,
 * the landing page and the editor sit under `allHousehold`, and Recipient shows the wording, so all are refetched; the
 * mutation stays pending until they are.
 */
export function useRemoveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, personId }: { kind: TemplateKind; personId: string }) =>
      apiFetch<TemplateSaveResponse>(`/api/templates/${kind}?personId=${encodeURIComponent(personId)}`, {
        method: 'DELETE',
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.allHousehold }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allRecipients }),
      ]),
  });
}
