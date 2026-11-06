import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { TemplateEditorResponse, TemplateKind } from '@splithouse/shared';

/**
 * The template editor with the latest saved values (`GET /api/templates/:kind/editor`). Nothing is kept once the
 * screen closes, so the form never opens on old values.
 *
 * @param kind The monthly breakdown or the nudge.
 * @param personId Whose custom template, new or saved, or null for the Default.
 */
export function useTemplateForm(kind: TemplateKind, personId: string | null) {
  return useQuery({
    queryKey: queryKeys.templateForm(kind, personId),
    queryFn: () =>
      apiFetch<TemplateEditorResponse>(
        `/api/templates/${kind}/editor${personId ? `?personId=${encodeURIComponent(personId)}` : ''}`,
      ),
    gcTime: 0,
  });
}
