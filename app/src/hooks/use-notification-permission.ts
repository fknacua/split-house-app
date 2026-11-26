import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { notificationPermission, type NotificationPermission } from '@/lib/notifications';

/** What {@link useNotificationPermission} returns. */
export interface NotificationPermissionState {
  /** The phone's permission, or `undefined` until the first read. */
  permission: NotificationPermission | undefined;
  /** Sets the permission from an answer the screen already has, such as the OS dialog's. */
  setPermission: (permission: NotificationPermission) => void;
}

/**
 * The phone's notification permission, read when the screen mounts and again each time the app comes back to the
 * foreground (after "Open system settings", for example). It never asks; a screen that asks passes the answer to
 * `setPermission`.
 *
 * @returns The permission and its setter.
 */
export function useNotificationPermission(): NotificationPermissionState {
  const [permission, setPermissionState] = useState<NotificationPermission | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const check = () => {
      void notificationPermission()
        .then((read) => {
          if (active) setPermissionState(read);
        })
        // A failed read keeps the last answer; the next foreground tries again.
        .catch(() => {});
    };
    check();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') check();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const setPermission = useCallback((next: NotificationPermission) => setPermissionState(next), []);
  return { permission, setPermission };
}
