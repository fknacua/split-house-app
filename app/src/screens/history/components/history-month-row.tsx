import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Badge, Icon } from '@/components';
import type { HistoryMonthRowProps } from '../types';

/** One past month in the History list: name, first detail line, chips and a chevron. Opens the month. */
export function HistoryMonthRow({ month, separated }: HistoryMonthRowProps) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={month.name}
      onPress={() => router.push(`/history/${month.month}`)}
      className={`min-h-[72px] flex-row items-center gap-3 py-3 pl-4 pr-2.5 active:opacity-70 ${
        separated ? 'border-t border-outline-variant' : ''
      }`}
    >
      <View className="min-w-0 flex-1 gap-1">
        <Text className="font-manrope-bold text-field text-on-surface">{month.name}</Text>
        <Text className="font-manrope-semibold text-caption text-on-surface-variant">
          {month.details[0]}
        </Text>
        {month.chips.length > 0 ? (
          <View className="flex-row flex-wrap gap-1.5 pt-0.5">
            {month.chips.map((chip) => (
              <Badge key={chip.label} label={chip.label} variant={chip.tone} />
            ))}
          </View>
        ) : null}
      </View>
      <Icon as={ChevronRight} className="text-on-surface-variant" />
    </Pressable>
  );
}
