import { Text, View } from 'react-native';

import type { PersonFactProps } from '../types';

/** One label and value in a person card's two-column grid. */
export function PersonFact({ fact }: PersonFactProps) {
  return (
    <View className="min-w-0 grow basis-[45%]">
      <Text className="font-manrope-semibold text-caption text-on-surface-variant">{fact.label}</Text>
      <Text
        className="font-manrope-bold text-label text-on-surface"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {fact.value}
      </Text>
    </View>
  );
}
