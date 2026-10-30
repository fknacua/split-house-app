import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { ChargePaymentResponse } from '@splithouse/shared';

/**
 * The Mark paid sheet for one charge, with the text already written and the amount and day filled
 * in (`GET /api/charges/:id/payment`).
 *
 * @param chargeId The charge's id.
 */
export function useChargePayment(chargeId: string) {
  return useQuery({
    queryKey: queryKeys.chargePayment(chargeId),
    queryFn: () => apiFetch<ChargePaymentResponse>(`/api/charges/${chargeId}/payment`),
  });
}
