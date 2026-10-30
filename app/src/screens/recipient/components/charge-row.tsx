import { Pressable, Text, View } from 'react-native';

import { Badge } from '@/components';
import type { ChargeRowProps } from '../types';

/**
 * One unpaid charge: title and amount, then the detail line and Home's chip. A rule sits above
 * every row but the first. Pressable when `onPress` is given (the Nudge about which charge? sheet).
 */
export function ChargeRow({ row, first, onPress }: ChargeRowProps) {
  const content = (
    <>
      <View className="flex-row justify-between gap-2">
        <Text className="shrink font-manrope-bold text-body text-on-surface">{row.title}</Text>
        <Text className="font-manrope-bold text-body text-on-surface" style={{ fontVariant: ['tabular-nums'] }}>
          {row.amount}
        </Text>
      </View>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="shrink font-manrope-semibold text-caption text-on-surface-variant">{row.detail}</Text>
        <Badge label={row.chip.label} variant={row.chip.tone} />
      </View>
    </>
  );
  const className = `gap-[3px] py-[11px] ${first ? '' : 'border-t border-outline-variant'}`;

  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} className={`${className} active:opacity-70`}>
      {content}
    </Pressable>
  ) : (
    <View className={className}>{content}</View>
  );
}
