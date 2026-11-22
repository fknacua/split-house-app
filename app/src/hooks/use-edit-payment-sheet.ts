import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { EditPaymentSheet } from '@splithouse/shared';

/**
 * The Edit payment sheet for one paid charge, with the text already written (`GET /api/charges/:id/payment`).
 *
 * @param chargeId The paid charge, or null while the sheet is closed.
 */
export function useEditPaymentSheet(chargeId: string | null) {
  return useQuery({
    queryKey: queryKeys.editPaymentSheet(chargeId ?? ''),
    queryFn: () => apiFetch<EditPaymentSheet>(`/api/charges/${chargeId}/payment`),
    enabled: chargeId !== null,
  });
}
