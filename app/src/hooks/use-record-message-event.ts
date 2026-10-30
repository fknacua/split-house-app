import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { CreateMessageEventRequest, MessageEventResponse } from '@splithouse/shared';

/** What {@link useRecordMessageEvent} records: whose chat was opened, for which month, and with what. */
export interface RecordMessageEventVariables {
  /** `YYYY-MM` key of the month the message is for. */
  month: string;
  /** Whose chat was opened. */
  personId: string;
  /** MONTHLY, or NUDGE with its charge. */
  event: CreateMessageEventRequest;
}

/**
 * Records that a person's WhatsApp chat was opened (`POST /api/months/:month/recipients/:personId/message-events`).
 * Home, the month's bill and Recipient show whether a message went out, so all are refetched; the
 * mutation stays pending until they are.
 */
export function useRecordMessageEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ month, personId, event }: RecordMessageEventVariables) =>
      apiFetch<MessageEventResponse>(`/api/months/${month}/recipients/${personId}/message-events`, {
        method: 'POST',
        body: event,
      }),
    onSuccess: (_, { month }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bill(month) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allRecipients }),
      ]),
  });
}
