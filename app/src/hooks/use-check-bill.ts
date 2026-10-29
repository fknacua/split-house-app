import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { CheckBillRequest, CheckBillResponse } from '@splithouse/shared';

/**
 * The server's checks of the Review bill values (`POST /api/months/:month/bill-draft/check`):
 * what stops Save. Runs again whenever the values change, and keeps the last answer on screen
 * meanwhile so the Alert does not flicker. Nothing is stored on the server.
 *
 * @param month `YYYY-MM`, the month the upload started from.
 * @param request The values to check (pass them debounced, so typing does not send a request per key).
 * @param enabled False until the form has been filled in from the draft.
 */
export function useCheckBill(month: string, request: CheckBillRequest, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.billCheck(month, request),
    queryFn: () =>
      apiFetch<CheckBillResponse>(`/api/months/${month}/bill-draft/check`, { method: 'POST', body: request }),
    enabled,
    placeholderData: keepPreviousData,
  });
}
