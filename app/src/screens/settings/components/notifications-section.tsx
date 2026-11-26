import { Text, View } from 'react-native';

import { Card } from '@/components';
import { useSaveNotificationSwitch } from '@/hooks';
import type { NotificationsSectionProps } from '../types';
import { NotificationRow } from './notification-row';
import { NotificationsBlocked } from './notifications-blocked';
import { NotificationsSkeleton } from './notifications-skeleton';

/**
 * The Notifications section: the label, a card with one Switch per group, and the device-only note. Each Switch
 * saves at once and moves back if the save fails. While the phone blocks notifications, the card opens with the
 * warning and "Open system settings", and the Switches show off and disabled. Settings never asks for the
 * permission. Shows the skeleton until both the rows and the permission are known.
 */
export function NotificationsSection({ rows, blocked }: NotificationsSectionProps) {
  const save = useSaveNotificationSwitch();

  return (
    <View className="gap-2">
      <Text className="mx-1 mt-2 font-manrope-bold text-label text-on-surface-variant">Notifications</Text>
      {rows && blocked !== undefined ? (
        <Card padded={false}>
          {blocked ? <NotificationsBlocked /> : null}
          {rows.map((row, i) => (
            <NotificationRow
              key={row.group}
              row={row}
              separated={blocked || i > 0}
              blocked={blocked}
              onChange={(on) => save.mutate({ group: row.group, on })}
            />
          ))}
        </Card>
      ) : (
        <NotificationsSkeleton />
      )}
      <Text className="mx-1 mt-1 font-manrope-semibold text-caption text-on-surface-variant">
        Notifications are for this device only
      </Text>
    </View>
  );
}
