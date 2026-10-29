import { Text, View } from 'react-native';

import { Badge } from '@/components';
import type { PersonRowProps } from '../types';

/** One person's share: name and shares, the amount, and a chip of at least 76px so they line up. */
export function PersonRow({ person }: PersonRowProps) {
  return (
    <View className="min-h-[52px] flex-row items-center gap-3 border-t border-outline-variant py-2">
      <View className="min-w-0 flex-1 gap-px">
        <Text numberOfLines={1} className="font-manrope-bold text-body text-on-surface">
          {person.name}
        </Text>
        <Text className="font-manrope-semibold text-caption text-on-surface-variant">{person.shares}</Text>
      </View>
      <Text
        className="font-manrope-extrabold text-body text-on-surface"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {person.amount}
      </Text>
      <Badge label={person.badge.label} variant={person.badge.tone} className="min-w-[76px] self-center" />
    </View>
  );
}
