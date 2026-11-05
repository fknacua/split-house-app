import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { HouseholdHomeFormResponse } from '@splithouse/shared';

/**
 * The Landlord & rooms screen with the latest saved values, the text already written
 * (`GET /api/household/home-form`). Nothing is kept once the screen closes, so the form never opens on old values.
 */
export function useHouseholdHomeForm() {
  return useQuery({
    queryKey: queryKeys.householdHomeForm,
    queryFn: () => apiFetch<HouseholdHomeFormResponse>('/api/household/home-form'),
    gcTime: 0,
  });
}
