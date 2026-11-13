import { Text, View } from 'react-native';

import type { SectionProps } from '../types';

/** A bold heading with its card under it: Amount, Details and Activity. */
export function Section({ title, children }: SectionProps) {
  return (
    <View className="gap-1.5">
      <Text accessibilityRole="header" className="font-manrope-bold text-label text-on-surface">
        {title}
      </Text>
      {children}
    </View>
  );
}
