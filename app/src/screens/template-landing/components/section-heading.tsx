import { Text, View } from 'react-native';

import type { SectionHeadingProps } from '../types';

/** A section's title with an optional sub under it, and a link button on the right. */
export function SectionHeading({ title, sub, action }: SectionHeadingProps) {
  return (
    <View className="flex-row items-center justify-between gap-2 px-1">
      <View className="min-w-0 shrink">
        <Text accessibilityRole="header" className="font-manrope-bold text-label text-on-surface">
          {title}
        </Text>
        {sub ? <Text className="font-manrope-semibold text-caption text-on-surface-variant">{sub}</Text> : null}
      </View>
      {action}
    </View>
  );
}
