import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { RecipientResponse } from '@splithouse/shared';

/**
 * Recipient: one person's amount, message preview and buttons for the month, with the text
 * already written (`GET /api/months/:month/recipients/:personId`).
 *
 * @param month `YYYY-MM` key.
 * @param personId The person the screen is for.
 * @param chargeId The overdue charge Home's Nudge chose, or null.
 */
export function useRecipient(month: string, personId: string, chargeId: string | null) {
  return useQuery({
    queryKey: queryKeys.recipient(month, personId, chargeId),
    queryFn: () =>
      apiFetch<RecipientResponse>(
        `/api/months/${month}/recipients/${personId}${chargeId ? `?chargeId=${encodeURIComponent(chargeId)}` : ''}`
      ),
  });
}
