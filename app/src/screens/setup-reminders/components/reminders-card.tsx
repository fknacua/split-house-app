import { Card } from '@/components';
import { NotificationRow } from '@/screens/settings/components/notification-row';
import { NotificationsBlocked } from '@/screens/settings/components/notifications-blocked';
import type { RemindersCardProps } from '../types';

/**
 * The Reminders page's card (`FirstRunReminders.dc.html`): Settings' four group switches, off and disabled until the
 * phone allows notifications. While it blocks them, the card opens with the warning and "Open system settings", as on
 * Settings. A switch saves at once and moves back if the save fails.
 */
export function RemindersCard({ rows, permission, onChange }: RemindersCardProps) {
  const locked = permission !== 'granted';
  const denied = permission === 'denied';
  return (
    <Card padded={false}>
      {denied ? <NotificationsBlocked /> : null}
      {rows.map((row, i) => (
        <NotificationRow
          key={row.group}
          row={row}
          separated={denied || i > 0}
          blocked={locked}
          onChange={(on) => onChange(row.group, on)}
        />
      ))}
    </Card>
  );
}
