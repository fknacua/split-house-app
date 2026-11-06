import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { TemplateEditorResponse, TemplateKind } from '@splithouse/shared';

/**
 * The template editor with the latest saved values (`GET /api/templates/:kind/editor`). Nothing is kept once the
 * screen closes, so the form never opens on old values.
 *
 * @param kind The monthly breakdown or the nudge.
 */
export function useTemplateForm(kind: TemplateKind) {
  return useQuery({
    queryKey: queryKeys.templateForm(kind),
    queryFn: () => apiFetch<TemplateEditorResponse>(`/api/templates/${kind}/editor`),
    gcTime: 0,
  });
}
