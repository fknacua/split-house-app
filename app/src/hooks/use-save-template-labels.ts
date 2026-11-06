import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { TemplateLabelsSaveRequest, TemplateSaveResponse } from '@splithouse/shared';

/**
 * Saves the line labels and section titles (`POST /api/templates/labels`), which apply immediately to every template.
 * The editor and landing pages sit under `allHousehold`, Recipient shows the wording, and the open editor's preview
 * renders the labels, so all are refetched; the mutation stays pending until they are, so the preview has the new
 * labels when the sheet closes.
 */
export function useSaveTemplateLabels() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (save: TemplateLabelsSaveRequest) =>
      apiFetch<TemplateSaveResponse>('/api/templates/labels', { method: 'POST', body: save }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.allHousehold }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allRecipients }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allTemplatePreviews }),
      ]),
  });
}
