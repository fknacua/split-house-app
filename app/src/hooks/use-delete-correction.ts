import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiRequestError, apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { DeleteCorrectionResponse } from '@splithouse/shared';

/**
 * Deletes a correction, its payment with it (`DELETE /api/charges/:id`). A 404 `no_charge` means it is already gone
 * (a Retry after a lost response), so it counts as done. Then every screen that showed it is refetched: Home, History
 * (the banner of the month it fixed too), View bill, Record payment, Send message, the Add charge sheet's charge list,
 * and every Charge details page but the correction's own, which is left as it is for the page to close; the mutation
 * stays pending until they are.
 *
 * @param chargeId The correction.
 */
export function useDeleteCorrection(chargeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<DeleteCorrectionResponse | null> => {
      try {
        return await apiFetch<DeleteCorrectionResponse>(`/api/charges/${chargeId}`, { method: 'DELETE' });
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404 && error.code === 'no_charge') return null;
        throw error;
      }
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.history }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allBills }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allRecordPaymentSheets }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allSendSheets }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allAddCharge }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.allChargeDetails,
          // The deleted one would only answer 404 now.
          predicate: (query) => query.queryKey[1] !== chargeId,
        }),
      ]),
  });
}
