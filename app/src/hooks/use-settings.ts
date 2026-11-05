import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { SettingsResponse } from '@splithouse/shared';

/** The Settings screen: the signed-in email and the Messages rows, with the text already written (`GET /api/settings`). */
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => apiFetch<SettingsResponse>('/api/settings'),
  });
}
