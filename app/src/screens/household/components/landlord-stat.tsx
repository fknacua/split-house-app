import { Text, View } from 'react-native';

import type { LandlordStatProps } from '../types';

/** A tile on the landlord card: a bold value over its label. */
export function LandlordStat({ stat }: LandlordStatProps) {
  return (
    <View className="min-w-0 flex-1 rounded-option bg-background px-2.5 py-2">
      <Text
        className="font-manrope-extrabold text-sheet-title text-on-selected"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {stat.value}
      </Text>
      <Text className="font-manrope-semibold text-caption text-on-selected">{stat.label}</Text>
    </View>
  );
}
