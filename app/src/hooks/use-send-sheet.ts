import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { SendMode, SendPreviewRequest, SendResponse } from '@splithouse/shared';

/** What {@link useSendSheet} asks for. */
export interface SendSheetRequest {
  mode: SendMode;
  /** Who is picked in To, or null for nobody. */
  personId: string | null;
  /** Nudge mode: the charges Nudge opened on (one from Home, a reminder’s from its Nudge), ticked as it opens. */
  chargeIds: string[] | null;
  /** Nudge mode: the ticked charges once the user changes them; null for the sheet as it opens. */
  ticked: string[] | null;
}

/**
 * The Send message sheet for the active month, with the text already written. As it opens, and for
 * a new person, `GET /api/send`; once ticks change, `POST /api/send/preview` with them. The last
 * sheet stays on screen while the next one loads, so a tick doesn't flash the skeleton.
 *
 * @param request Mode, person, charges opened on and ticks.
 * @param enabled False while the sheet is closed.
 */
export function useSendSheet({ mode, personId, chargeIds, ticked }: SendSheetRequest, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.sendSheet(mode, personId, chargeIds, ticked),
    queryFn: () => {
      if (ticked !== null && personId !== null) {
        const body: SendPreviewRequest = { personId, chargeIds: ticked };
        return apiFetch<SendResponse>('/api/send/preview', { method: 'POST', body });
      }
      const query = new URLSearchParams({ mode });
      if (personId) query.set('personId', personId);
      if (chargeIds && chargeIds.length > 0) query.set('chargeIds', chargeIds.join(','));
      return apiFetch<SendResponse>(`/api/send?${query.toString()}`);
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}
