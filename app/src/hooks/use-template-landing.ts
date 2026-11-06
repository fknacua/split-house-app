import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { TemplateKind, TemplateLandingResponse } from '@splithouse/shared';

/**
 * One template's landing page: the Default and the custom templates with their previews, and the For who rows
 * (`GET /api/templates/:kind`).
 *
 * @param kind The monthly breakdown or the nudge.
 */
export function useTemplateLanding(kind: TemplateKind) {
  return useQuery({
    queryKey: queryKeys.templateLanding(kind),
    queryFn: () => apiFetch<TemplateLandingResponse>(`/api/templates/${kind}`),
  });
}
