import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { focusManager } from '@tanstack/react-query';

/**
 * Tells TanStack Query when the app is in the foreground, so stale data
 * refetches when the user comes back to it. React Native has no window focus,
 * so this stands in for it. No-op on web.
 */
export function useAppStateFocus(): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });
    return () => subscription.remove();
  }, []);
}
