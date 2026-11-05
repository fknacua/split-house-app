import { Clock } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Icon } from '@/components';
import type { DatedHeadingProps } from '../types';

/** The heading above the cards, with the clock line while saved values have not taken effect. */
export function DatedHeading({ title, note }: DatedHeadingProps) {
  return (
    <View className="gap-1 px-1">
      <Text accessibilityRole="header" className="font-manrope-bold text-label text-on-surface">
        {title}
      </Text>
      {note ? (
        <View className="flex-row items-center gap-1.5">
          <Icon as={Clock} size={14} className="text-on-surface-variant" />
          <Text className="min-w-0 flex-1 font-manrope-semibold text-caption text-on-surface-variant">{note}</Text>
        </View>
      ) : null}
    </View>
  );
}
