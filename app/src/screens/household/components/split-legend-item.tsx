import { Text, View } from 'react-native';

import { PERSON_COLOR_BG, PERSON_COLOR_BORDER } from '@/lib';
import type { SplitLegendItemProps } from '../types';

/** One person in a split row's legend: their color dot, name and amount. Someone not in the total gets a hollow ring and a muted amount. */
export function SplitLegendItem({ segment }: SplitLegendItemProps) {
  return (
    <View className="w-[48%] min-w-0 flex-row items-center gap-2">
      <View
        className={`h-2.5 w-2.5 rounded-full ${
          segment.inTotal ? PERSON_COLOR_BG[segment.color] : `border-2 ${PERSON_COLOR_BORDER[segment.color]}`
        }`}
      />
      <Text className="min-w-0 flex-1 font-manrope-semibold text-caption text-on-surface-variant">
        {segment.name}
      </Text>
      <Text
        className={`font-manrope-extrabold text-caption ${segment.inTotal ? 'text-on-surface' : 'text-on-surface-variant'}`}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {segment.value}
      </Text>
    </View>
  );
}
