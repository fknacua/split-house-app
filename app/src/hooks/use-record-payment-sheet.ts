import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { RecordPaymentPreviewRequest, RecordPaymentSheet } from '@splithouse/shared';

/** What {@link useRecordPaymentSheet} asks for. */
export interface RecordPaymentSheetRequest {
  /** Who is picked in From, or null for nobody. */
  personId: string | null;
  /** The charge Mark paid was tapped on, ticked as the sheet opens; null otherwise. */
  chargeId: string | null;
  /** The ticked charges once the user changes them; null for the sheet as it opens. */
  ticked: string[] | null;
}

/**
 * The Record payment sheet for the active month, with the text already written. As it opens, and for
 * a new person, `GET /api/record-payment`; once ticks change, `POST /api/record-payment/preview` with
 * them. The last sheet stays on screen while the next one loads, so a tick doesn't flash the skeleton.
 *
 * @param request Person, tapped charge and ticks.
 * @param enabled False while the sheet is closed.
 */
export function useRecordPaymentSheet({ personId, chargeId, ticked }: RecordPaymentSheetRequest, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.recordPaymentSheet(personId, chargeId, ticked),
    queryFn: () => {
      if (ticked !== null && personId !== null) {
        const body: RecordPaymentPreviewRequest = { personId, chargeIds: ticked };
        return apiFetch<RecordPaymentSheet>('/api/record-payment/preview', { method: 'POST', body });
      }
      const query = new URLSearchParams();
      if (personId) query.set('personId', personId);
      if (chargeId) query.set('chargeId', chargeId);
      const search = query.toString();
      return apiFetch<RecordPaymentSheet>(search ? `/api/record-payment?${search}` : '/api/record-payment');
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}
