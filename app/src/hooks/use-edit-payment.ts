import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { EditPaymentRequest, EditPaymentResponse } from '@splithouse/shared';

/**
 * Refetches every screen that shows a charge's payment: Home, History, the month's bill, Record
 * payment, Send message, Charge details and Edit payment.
 */
function refreshAfterEdit(queryClient: QueryClient, { month }: EditPaymentResponse) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.home }),
    queryClient.invalidateQueries({ queryKey: queryKeys.history }),
    queryClient.invalidateQueries({ queryKey: queryKeys.bill(month) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.allRecordPaymentSheets }),
    queryClient.invalidateQueries({ queryKey: queryKeys.allSendSheets }),
    queryClient.invalidateQueries({ queryKey: queryKeys.allChargeDetails }),
    queryClient.invalidateQueries({ queryKey: queryKeys.allEditPaymentSheets }),
  ]);
}

/**
 * Changes a paid charge's Received on (`PATCH /api/charges/:id/payment`). The mutation stays pending
 * until the screens behind the sheet are refetched, so the sheet keeps its spinner until they are up to date.
 *
 * @param chargeId The paid charge.
 */
export function useSavePaymentDate(chargeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: EditPaymentRequest) =>
      apiFetch<EditPaymentResponse>(`/api/charges/${chargeId}/payment`, { method: 'PATCH', body: values }),
    onSuccess: (response) => refreshAfterEdit(queryClient, response),
  });
}

/**
 * Removes a charge's payment, so it shows as unpaid again (`DELETE /api/charges/:id/payment`). Pending
 * until the screens behind are refetched, as {@link useSavePaymentDate}.
 *
 * @param chargeId The paid charge.
 */
export function useRemovePayment(chargeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<EditPaymentResponse>(`/api/charges/${chargeId}/payment`, { method: 'DELETE' }),
    onSuccess: (response) => refreshAfterEdit(queryClient, response),
  });
}
