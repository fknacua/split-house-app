import { Text, View } from 'react-native';

import { PERSON_COLOR_BG } from '@/lib';
import type { ViewColorRowProps } from '../types';

/** The Color row on a person's View screen: the label with the color's dot and name. */
export function ViewColorRow({ color, name }: ViewColorRowProps) {
  return (
    <View className="flex-row items-center justify-between gap-2">
      <Text className="font-manrope-bold text-label text-on-surface">Color</Text>
      <View className="flex-row items-center gap-2">
        <View className={`size-3 rounded-full ${PERSON_COLOR_BG[color]}`} />
        <Text className="font-manrope-semibold text-label text-on-surface">{name}</Text>
      </View>
    </View>
  );
}
