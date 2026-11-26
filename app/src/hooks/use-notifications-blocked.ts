import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { notificationsAllowed } from '@/lib/notifications';

/**
 * Whether the phone blocks this app's notifications, read when the screen mounts and again each time the app comes
 * back to the foreground (after "Open system settings", for example). It never asks for the permission, so one not
 * yet granted counts as blocked.
 *
 * @returns `true` while notifications are not allowed, `false` once they are, and `undefined` until the first read.
 */
export function useNotificationsBlocked(): boolean | undefined {
  const [blocked, setBlocked] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const check = () => {
      void notificationsAllowed()
        .then((allowed) => {
          if (active) setBlocked(!allowed);
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

  return blocked;
}
