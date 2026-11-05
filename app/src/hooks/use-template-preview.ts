import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { TemplatePreviewRequest, TemplatePreviewResponse } from '@splithouse/shared';

/**
 * A draft template rendered by the server on a sample person (`POST /api/templates/preview`), with whether Save is
 * allowed and the errors per field. Keeps the last answer on screen while a new one loads, so the card does not
 * flicker. Nothing is stored on the server.
 *
 * @param request The draft to render (pass it debounced, so typing does not send a request per key).
 */
export function useTemplatePreview(request: TemplatePreviewRequest) {
  return useQuery({
    queryKey: queryKeys.templatePreview(request),
    queryFn: () =>
      apiFetch<TemplatePreviewResponse>('/api/templates/preview', { method: 'POST', body: request }),
    placeholderData: keepPreviousData,
  });
}
