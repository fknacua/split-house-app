import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { PaymentOptionsResponse } from '@splithouse/shared';

/**
 * Record payment's From and For lists: who still has something to pay and each charge with its
 * sheet, worded for Record payment (`GET /api/months/:month/payment-options`).
 *
 * @param month `YYYY-MM` key of the month Record payment is opened for.
 */
export function usePaymentOptions(month: string) {
  return useQuery({
    queryKey: queryKeys.paymentOptions(month),
    queryFn: () => apiFetch<PaymentOptionsResponse>(`/api/months/${month}/payment-options`),
  });
}
