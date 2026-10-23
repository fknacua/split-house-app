import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Props for {@link Screen}. */
export interface ScreenProps {
  /** Extra classes for the screen container. */
  className?: string;
}

/**
 * Page wrapper shared by every screen: fills the space, uses the `background`
 * token and keeps content below the status bar. Change page-level chrome here.
 * The bottom inset is left to the bottom navigation bar.
 */
export function Screen({ className = "", children }: PropsWithChildren<ScreenProps>) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`flex-1 bg-background ${className}`}
      style={{ paddingTop: insets.top }}
    >
      {children}
    </View>
  );
}
