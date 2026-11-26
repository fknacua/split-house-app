import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type {
  NotificationGroupKey,
  SettingsNotificationSaveRequest,
  SettingsResponse,
} from '@splithouse/shared';

/**
 * Sets one switch's `on` in the cached Settings screen, leaving the other rows as they are, so a save of another
 * switch still waiting keeps its own value.
 *
 * @param data - The cached screen, or undefined when nothing is cached.
 * @param group - The switch to set.
 * @param on - Its new value.
 * @returns The screen with that one row changed.
 */
function withSwitch(
  data: SettingsResponse | undefined,
  group: NotificationGroupKey,
  on: boolean,
): SettingsResponse | undefined {
  if (!data) return data;
  return {
    ...data,
    notifications: data.notifications.map((row) => (row.group === group ? { ...row, on } : row)),
  };
}

/**
 * Turns one Settings notification switch on or off (`PUT /api/settings/notifications`). The switch moves at once;
 * a failed save moves it back (an unreachable server also raises the blocking prompt). Once saved, the row takes the
 * server's value, and the mutation's success rebuilds the phone's reminders (`useNotificationSchedule`).
 */
export function useSaveNotificationSwitch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (save: SettingsNotificationSaveRequest) =>
      apiFetch<SettingsResponse>('/api/settings/notifications', { method: 'PUT', body: save }),
    onMutate: async ({ group, on }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings });
      queryClient.setQueryData<SettingsResponse>(queryKeys.settings, (data) => withSwitch(data, group, on));
    },
    onError: (_error, { group, on }) => {
      queryClient.setQueryData<SettingsResponse>(queryKeys.settings, (data) => withSwitch(data, group, !on));
    },
    onSuccess: (response, { group }) => {
      const saved = response.notifications.find((row) => row.group === group);
      if (!saved) return;
      queryClient.setQueryData<SettingsResponse>(queryKeys.settings, (data) => withSwitch(data, group, saved.on));
    },
  });
}
