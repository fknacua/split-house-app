import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { HouseholdFormResponse } from '@splithouse/shared';

/**
 * One person's Edit and View screens for one month, with the text already written
 * (`GET /api/household/form`). While a newly picked month loads, the previous response stays as
 * placeholder data; check `isPlaceholderData` before treating it as the picked month.
 *
 * @param personId The person.
 * @param month `YYYY-MM` key of the month to read, or undefined for the first Starts from option.
 */
export function useHouseholdForm(personId: string, month?: string) {
  return useQuery({
    queryKey: queryKeys.householdForm(personId, month ?? null),
    queryFn: () => {
      const query = `personId=${encodeURIComponent(personId)}${month ? `&month=${month}` : ''}`;
      return apiFetch<HouseholdFormResponse>(`/api/household/form?${query}`);
    },
    placeholderData: keepPreviousData,
  });
}
