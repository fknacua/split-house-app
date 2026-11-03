import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { HouseholdEdit, HouseholdEditPreviewResponse } from '@splithouse/shared';

/**
 * What a Household edit would change (`POST /api/household/edits/preview`): the summary groups, whether
 * Save is allowed and the errors per field. Keeps the last answer on screen
 * while a new one loads, so the summary does not flicker. Nothing is stored on the server.
 *
 * @param edit The edit to check (pass it debounced, so typing does not send a request per key).
 */
export function useHouseholdEditPreview(edit: HouseholdEdit) {
  return useQuery({
    queryKey: queryKeys.householdEditPreview(edit),
    queryFn: () =>
      apiFetch<HouseholdEditPreviewResponse>('/api/household/edits/preview', { method: 'POST', body: edit }),
    placeholderData: keepPreviousData,
  });
}
