import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { AddChargePreview, AddChargeSheet, AddChargeValues } from '@splithouse/shared';

/**
 * The Add charge sheet for the newest opened month, as it opens (`GET /api/add-charge`): the options of both modes,
 * the opening values and their preview. Opened on a charge (`?chargeId=`), it is `Add correction` with it picked.
 *
 * @param enabled False while the sheet is closed.
 * @param chargeId The charge `Add correction` was tapped on, or null for Home's Add charge.
 */
export function useAddChargeSheet(enabled: boolean, chargeId: string | null) {
  return useQuery({
    queryKey: queryKeys.addChargeSheet(chargeId),
    queryFn: () =>
      apiFetch<AddChargeSheet>(chargeId ? `/api/add-charge?chargeId=${encodeURIComponent(chargeId)}` : '/api/add-charge'),
    enabled,
  });
}

/**
 * What follows from the Add charge fields as they stand (`POST /api/add-charge/preview`): which fields show, the
 * split preview, Custom's Alert, Save and the confirm dialog. Keeps the last answer on screen while the next one
 * loads, so the preview doesn't flicker. Nothing is stored on the server.
 *
 * @param values The fields (pass them debounced, so typing doesn't send a request per key), or null while the sheet
 *   is closed or the fields are still as they opened (the sheet's own preview covers those).
 */
export function useAddChargePreview(values: AddChargeValues | null) {
  return useQuery({
    queryKey: queryKeys.addChargePreview(values),
    queryFn: () => apiFetch<AddChargePreview>('/api/add-charge/preview', { method: 'POST', body: values }),
    enabled: values !== null,
    placeholderData: keepPreviousData,
  });
}
