import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { SetupPeopleResponse } from '@splithouse/shared';

/**
 * First run's People page: the cards, the empty card, Add more and whether Save people is allowed, with the text
 * already written (`GET /api/setup/people`).
 */
export function useSetupPeople() {
  return useQuery({
    queryKey: queryKeys.setupPeople,
    queryFn: () => apiFetch<SetupPeopleResponse>('/api/setup/people'),
  });
}
