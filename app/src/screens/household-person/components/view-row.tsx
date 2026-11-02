import { Text, View } from 'react-native';

import type { ViewRowProps } from '../types';

/** One field on a person's View screen: the label above plain value text. */
export function ViewRow({ row, half = false }: ViewRowProps) {
  return (
    <View className={`gap-1.5 ${half ? 'min-w-0 grow basis-[45%]' : ''}`}>
      <Text className="font-manrope-bold text-label text-on-surface">{row.label}</Text>
      <Text className="font-manrope-medium text-field text-on-surface" style={{ fontVariant: ['tabular-nums'] }}>
        {row.value}
      </Text>
    </View>
  );
}
