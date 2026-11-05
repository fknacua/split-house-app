import { Text, View } from 'react-native';

import { PERSON_COLOR_BG, PERSON_COLOR_BORDER } from '@/lib/person-color';
import type { RoomRowProps } from '../types';

/** A tenant's read-only row on the Rent or Aircon card. A room not in the total has a hollow ring and muted text. */
export function RoomRow({ row }: RoomRowProps) {
  const textColor = row.inTotal ? 'text-on-surface' : 'text-on-surface-variant';
  return (
    <View className="min-h-12 flex-row items-center gap-2.5">
      <View
        className={`h-2.5 w-2.5 rounded-full ${row.inTotal ? PERSON_COLOR_BG[row.color] : `border-2 ${PERSON_COLOR_BORDER[row.color]}`}`}
      />
      <Text className={`min-w-0 flex-1 font-manrope-semibold text-body ${textColor}`}>
        {row.name}
        {row.inTotal ? null : <Text className="text-caption text-on-surface-variant"> · Not in total</Text>}
      </Text>
      <Text className={`font-manrope-bold text-body ${textColor}`} style={{ fontVariant: ['tabular-nums'] }}>
        {row.value}
      </Text>
    </View>
  );
}
