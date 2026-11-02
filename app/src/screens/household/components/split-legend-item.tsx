import { Text, View } from 'react-native';

import { PERSON_COLOR_BG } from '@/lib';
import type { SplitLegendItemProps } from '../types';

/** One person in a split row's legend: their color dot, name and amount. */
export function SplitLegendItem({ segment }: SplitLegendItemProps) {
  return (
    <View className="w-[48%] min-w-0 flex-row items-center gap-2">
      <View className={`h-2.5 w-2.5 rounded-full ${PERSON_COLOR_BG[segment.color]}`} />
      <Text className="min-w-0 flex-1 font-manrope-semibold text-caption text-on-surface-variant">
        {segment.name}
      </Text>
      <Text
        className="font-manrope-extrabold text-caption text-on-surface"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {segment.value}
      </Text>
    </View>
  );
}
