import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { MessageEventResponse, SendEventRequest } from '@splithouse/shared';

/**
 * Records that a message went out on WhatsApp (`POST /api/send/events`), with the body the Send target carries.
 * Home, the month's bill, Charge details and the Send message sheet show whether a message went out, so
 * all are refetched; the mutation stays pending until they are.
 */
export function useRecordMessageEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (event: SendEventRequest) =>
      apiFetch<MessageEventResponse>('/api/send/events', { method: 'POST', body: event }),
    onSuccess: (_, { month }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bill(month) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allChargeDetails }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allSendSheets }),
      ]),
  });
}
