import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { AddChargeRequest, AddChargeResponse } from '@splithouse/shared';

/**
 * Saves an Add charge charge in the newest opened month (`POST /api/add-charge`). The request carries the sheet's
 * idempotency key, so a Retry after a lost response never stores it twice. Home, History, the month's bill, Record
 * payment, Send message, Charge details and the Add charge sheet show what it adds, so all are refetched; the
 * mutation stays pending until they are, so the sheet keeps its spinner until the screens behind it are up to date.
 */
export function useAddCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: AddChargeRequest) =>
      apiFetch<AddChargeResponse>('/api/add-charge', { method: 'POST', body: request }),
    onSuccess: ({ month }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.history }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bill(month) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allRecordPaymentSheets }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allSendSheets }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allChargeDetails }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allAddCharge }),
      ]),
  });
}
