import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { HouseholdSplitFormResponse } from '@splithouse/shared';

/**
 * The Household split screen with the latest saved values, the text already written
 * (`GET /api/household/split-form`). Nothing is kept once the screen closes, so the form never opens on old values.
 */
export function useHouseholdSplitForm() {
  return useQuery({
    queryKey: queryKeys.householdSplitForm,
    queryFn: () => apiFetch<HouseholdSplitFormResponse>('/api/household/split-form'),
    gcTime: 0,
  });
}
