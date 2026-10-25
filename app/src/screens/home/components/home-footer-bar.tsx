import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { topShadow } from '@/lib/elevation';
import { useReportNavFooter } from '@/lib/nav-footer';
import { useThemePreference } from '@/lib/theme-preference';

/**
 * The sticky bar under Home's content, above the bottom navigation. It reports itself to the
 * navigation, which drops its own shadow while the bar is showing.
 */
export function HomeFooterBar({ children }: PropsWithChildren) {
  const { resolved } = useThemePreference();
  useReportNavFooter();

  return (
    <View
      className="gap-2.5 border-t border-outline-variant bg-background px-4 py-2.5"
      style={{ boxShadow: topShadow(resolved) }}
    >
      {children}
    </View>
  );
}
