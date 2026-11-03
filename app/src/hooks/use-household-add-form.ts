import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { HouseholdAddFormResponse } from '@splithouse/shared';

/**
 * The Add subtenant screen, the text already written (`GET /api/household/add-form`). Nothing is kept once the
 * screen closes, so the default color always reflects the household.
 */
export function useHouseholdAddForm() {
  return useQuery({
    queryKey: queryKeys.householdAddForm,
    queryFn: () => apiFetch<HouseholdAddFormResponse>('/api/household/add-form'),
    gcTime: 0,
  });
}
