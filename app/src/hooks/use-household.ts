import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { HouseholdViewResponse } from '@splithouse/shared';

/**
 * The Household screen for one month, with the text already written (`GET /api/household`). While a
 * newly picked month loads, the previous response stays as placeholder data, so the "Showing:" list
 * stays available; check `isPlaceholderData` before drawing it as the picked month.
 *
 * @param month `YYYY-MM` key of the month to show, or undefined for the active month.
 */
export function useHousehold(month?: string) {
  return useQuery({
    queryKey: queryKeys.household(month ?? null),
    queryFn: () =>
      apiFetch<HouseholdViewResponse>(month ? `/api/household?month=${month}` : '/api/household'),
    placeholderData: keepPreviousData,
  });
}
