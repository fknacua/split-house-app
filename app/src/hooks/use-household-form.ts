import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { HouseholdFormResponse } from '@splithouse/shared';

/**
 * One person's Edit and View screens with their latest saved values, the text already written
 * (`GET /api/household/form`). Nothing is kept once the screens close, so a form never opens on old values.
 *
 * @param personId The person.
 */
export function useHouseholdForm(personId: string) {
  return useQuery({
    queryKey: queryKeys.householdForm(personId),
    queryFn: () => apiFetch<HouseholdFormResponse>(`/api/household/form?personId=${encodeURIComponent(personId)}`),
    gcTime: 0,
  });
}
