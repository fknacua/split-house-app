import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { RecordPaymentPreviewRequest, RecordPaymentSheet } from '@splithouse/shared';

/** What {@link useRecordPaymentSheet} asks for. */
export interface RecordPaymentSheetRequest {
  /** Who is picked in From, or null for nobody. */
  personId: string | null;
  /** The charges Mark paid (one) or a reminder’s Paid (its charges) opened on, ticked as the sheet opens; else null. */
  chargeIds: string[] | null;
  /** The ticked charges once the user changes them; null for the sheet as it opens. */
  ticked: string[] | null;
}

/**
 * The Record payment sheet for the active month, with the text already written. As it opens, and for
 * a new person, `GET /api/record-payment`; once ticks change, `POST /api/record-payment/preview` with
 * them. The last sheet stays on screen while the next one loads, so a tick doesn't flash the skeleton.
 *
 * @param request Person, charges opened on and ticks.
 * @param enabled False while the sheet is closed.
 */
export function useRecordPaymentSheet({ personId, chargeIds, ticked }: RecordPaymentSheetRequest, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.recordPaymentSheet(personId, chargeIds, ticked),
    queryFn: () => {
      if (ticked !== null && personId !== null) {
        const body: RecordPaymentPreviewRequest = { personId, chargeIds: ticked };
        return apiFetch<RecordPaymentSheet>('/api/record-payment/preview', { method: 'POST', body });
      }
      const query = new URLSearchParams();
      if (personId) query.set('personId', personId);
      if (chargeIds && chargeIds.length > 0) query.set('chargeIds', chargeIds.join(','));
      const search = query.toString();
      return apiFetch<RecordPaymentSheet>(search ? `/api/record-payment?${search}` : '/api/record-payment');
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}
