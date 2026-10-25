import { Text, View } from 'react-native';

import { Badge } from '@/components';
import { formatDueDate } from '../helpers';
import type { HomeRowProps } from '../types';

/** The always-visible part of a charge row: due day, title and amount, then the detail line and badge. */
export function HomeRowHeader({ row }: HomeRowProps) {
  const due = row.dueDate ? formatDueDate(row.dueDate) : null;

  return (
    <>
      <View className="w-9.5 items-center pt-px">
        <Text
          className="font-manrope-extrabold text-sheet-title leading-6 text-on-surface"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {due?.day ?? '—'}
        </Text>
        {due ? (
          <Text className="font-manrope-bold text-[10px] leading-[14px] tracking-[0.8px] text-on-surface-variant">
            {due.month}
          </Text>
        ) : null}
      </View>
      <View className="min-w-0 flex-1 gap-[3px]">
        <View className="flex-row justify-between gap-2">
          <Text
            numberOfLines={1}
            className="min-w-0 flex-1 font-manrope-bold text-body text-on-surface"
          >
            {row.title}
          </Text>
          <Text
            className="font-manrope-bold text-body text-on-surface"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {row.amount}
          </Text>
        </View>
        <View className="flex-row items-center justify-between gap-2">
          <Text className="min-w-0 flex-1 font-manrope-semibold text-caption text-on-surface-variant">
            {row.detail}
          </Text>
          <Badge label={row.badge.label} variant={row.badge.tone} />
        </View>
      </View>
    </>
  );
}
