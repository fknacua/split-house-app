import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { topShadow } from '@/lib/elevation';
import { useThemePreference } from '@/lib/theme-preference';

/**
 * The sticky bar under a subpage's content (Bill upload, View bill), with the top shadow. There is
 * no bottom navigation on a subpage, so it pads for the gesture bar itself.
 *
 * @param children - The footer's buttons, stacked.
 */
export function SubpageFooter({ children }: { children: ReactNode }) {
  const { resolved } = useThemePreference();
  const insets = useSafeAreaInsets();
  return (
    <View
      className="gap-1 bg-background px-4 pt-3"
      style={{ boxShadow: topShadow(resolved), paddingBottom: 28 + insets.bottom }}
    >
      {children}
    </View>
  );
}
