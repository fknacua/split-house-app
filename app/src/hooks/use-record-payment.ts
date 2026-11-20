import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { RecordPaymentRequest, RecordPaymentResponse } from '@splithouse/shared';

/**
 * Records a payment from one person for the ticked charges, each paid in full
 * (`POST /api/record-payment`). Home, History, each paid month's bill, Record payment, Edit payment,
 * Recipient, Send message and Charge details show it, so all are refetched; the mutation stays
 * pending until they are, so the sheet keeps its spinner until the screens behind it are up to date.
 */
export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: RecordPaymentRequest) =>
      apiFetch<RecordPaymentResponse>('/api/record-payment', { method: 'POST', body: values }),
    onSuccess: ({ months }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.history }),
        ...months.map((month) => queryClient.invalidateQueries({ queryKey: queryKeys.bill(month) })),
        queryClient.invalidateQueries({ queryKey: queryKeys.allRecordPaymentSheets }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allChargePayments }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allRecipients }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allSendSheets }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allChargeDetails }),
      ]),
  });
}
