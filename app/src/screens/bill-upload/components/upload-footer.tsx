import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { topShadow } from '@/lib/elevation';
import { useThemePreference } from '@/lib/theme-preference';
import type { UploadFooterProps } from '../types';

/** The sticky bar under Bill upload's content. There is no bottom navigation here, so it pads for the gesture bar itself. */
export function UploadFooter({ children }: UploadFooterProps) {
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
