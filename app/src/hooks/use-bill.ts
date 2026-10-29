import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { BillViewResponse } from '@splithouse/shared';

/**
 * View bill: the month's saved utilities bill, who has paid their share and the footer action,
 * with the text already written (`GET /api/months/:month/bill`).
 *
 * @param month `YYYY-MM` key.
 */
export function useBill(month: string) {
  return useQuery({
    queryKey: queryKeys.bill(month),
    queryFn: () => apiFetch<BillViewResponse>(`/api/months/${month}/bill`),
  });
}
