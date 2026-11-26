import { useNotificationPermission } from './use-notification-permission';

/**
 * Whether the phone blocks this app's notifications, read when the screen mounts and again each time the app comes
 * back to the foreground (after "Open system settings", for example). It never asks for the permission, so one not
 * yet granted counts as blocked.
 *
 * @returns `true` while notifications are not allowed, `false` once they are, and `undefined` until the first read.
 */
export function useNotificationsBlocked(): boolean | undefined {
  const { permission } = useNotificationPermission();
  return permission === undefined ? undefined : permission !== 'granted';
}
