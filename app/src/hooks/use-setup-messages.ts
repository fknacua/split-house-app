import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { SetupMessagesResponse } from '@splithouse/shared';

/**
 * First run's Custom messages page: the two template rows, the note, whether Save is allowed and the `skipMessages`
 * dialog's text, already written (`GET /api/setup/messages`).
 */
export function useSetupMessages() {
  return useQuery({
    queryKey: queryKeys.setupMessages,
    queryFn: () => apiFetch<SetupMessagesResponse>('/api/setup/messages'),
  });
}
