import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { CheckBillRequest, CheckBillResponse } from '@splithouse/shared';

/** How long an answer for the same values is reused when Save asks again, in milliseconds. */
const CHECK_FRESH_MS = 60_000;

function fetchBillCheck(month: string, request: CheckBillRequest) {
  return apiFetch<CheckBillResponse>(`/api/months/${month}/bill-draft/check`, { method: 'POST', body: request });
}

/**
 * The server's checks of the Review bill values (`POST /api/months/:month/bill-draft/check`):
 * what stops Save, and what to warn about. Runs again whenever the values change, and keeps the
 * last answer on screen meanwhile so the Alert does not flicker. Nothing is stored on the server.
 *
 * @param month `YYYY-MM`, the month the upload started from.
 * @param request The values to check (pass them debounced, so typing does not send a request per key).
 * @param enabled False until the form has been filled in from the draft.
 */
export function useCheckBill(month: string, request: CheckBillRequest, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.billCheck(month, request),
    queryFn: () => fetchBillCheck(month, request),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/**
 * Checks exactly these values now, for when Save is tapped: the answer on screen can be up to the
 * typing pause behind the form. An answer for the same values that is already cached is reused.
 *
 * @param month `YYYY-MM`, the month the upload started from.
 * @returns A function taking the values and resolving to the server's answer. It rejects when the
 *   request fails.
 */
export function useCheckBillNow(month: string) {
  const queryClient = useQueryClient();
  return (request: CheckBillRequest) =>
    queryClient.query({
      queryKey: queryKeys.billCheck(month, request),
      queryFn: () => fetchBillCheck(month, request),
      staleTime: CHECK_FRESH_MS,
    });
}
