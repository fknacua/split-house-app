import type { SettingsNotificationRow } from '@splithouse/shared';

import type { NotificationPermission } from '@/lib/notifications';

/** Props for {@link RemindersCard}. */
export interface RemindersCardProps {
  /** The four switches from `GET /api/settings`. */
  rows: SettingsNotificationRow[];
  /** The phone's permission: the switches only work once it is `granted`. */
  permission: NotificationPermission;
  /** Called with a switch's group and new value on tap. */
  onChange: (group: SettingsNotificationRow['group'], on: boolean) => void;
}

/** Props for {@link RemindersFooter}. */
export interface RemindersFooterProps {
  /** Decides the buttons: `Allow notifications` and `Not now`, `Done`, or `Continue`. */
  permission: NotificationPermission;
  /** The OS dialog is open, so `Allow notifications` shows the spinner. */
  asking: boolean;
  /** The server call running: `mark` for `Done`, `skip` for `Not now` and `Continue`. Null when none is. */
  pending: 'mark' | 'skip' | null;
  /** A failed mark's or skip's message, shown above the buttons; null for none. */
  error: string | null;
  onAllow: () => void;
  onDone: () => void;
  onSkip: () => void;
}
