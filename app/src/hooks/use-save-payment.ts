import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { SavePaymentRequest, SavePaymentResponse } from '@splithouse/shared';

/**
 * Records what was received for one charge (`POST /api/charges/:id/payment`). Home, History, the
 * charge's month's bill, the charge's own sheet and Record payment's lists show it, so all are refetched; the mutation
 * stays pending until they are, so the sheet keeps its spinner until the screens behind it are up
 * to date.
 *
 * @param chargeId The charge's id.
 */
export function useSavePayment(chargeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: SavePaymentRequest) =>
      apiFetch<SavePaymentResponse>(`/api/charges/${chargeId}/payment`, { method: 'POST', body: values }),
    onSuccess: ({ month }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.history }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bill(month) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.chargePayment(chargeId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allPaymentOptions }),
      ]),
  });
}
