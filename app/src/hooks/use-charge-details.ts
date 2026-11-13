import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { ChargeDetailsResponse } from '@splithouse/shared';

/**
 * Charge details for one charge, with the text already written (`GET /api/charges/:id/details`).
 *
 * @param chargeId The charge's id.
 */
export function useChargeDetails(chargeId: string) {
  return useQuery({
    queryKey: queryKeys.chargeDetails(chargeId),
    queryFn: () => apiFetch<ChargeDetailsResponse>(`/api/charges/${chargeId}/details`),
  });
}
