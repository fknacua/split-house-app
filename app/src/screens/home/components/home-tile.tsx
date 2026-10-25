import { Text, View } from 'react-native';

import type { HomeTileProps } from '../types';

/** A small figure inside the hero: a label over a bold value. */
export function HomeTile({ label, value }: HomeTileProps) {
  return (
    <View className="min-w-0 flex-1 gap-0.5 rounded-2xl bg-background p-3">
      <Text className="font-manrope-semibold text-caption text-on-selected opacity-85">{label}</Text>
      <Text
        className="font-manrope-extrabold text-sheet-title text-on-selected"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
    </View>
  );
}
