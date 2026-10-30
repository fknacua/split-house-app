import { Text, View } from 'react-native';

import { Badge, Card } from '@/components';
import type { AmountCardProps } from '../types';

const STATUS_TONE = {
  default: 'text-on-surface-variant',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

/** The top card: what the person owes this month, its chip and one status line. */
export function AmountCard({ card }: AmountCardProps) {
  return (
    <Card padded={false} className="gap-0.5 px-4 pb-3.5 pt-3">
      <Text className="font-manrope-semibold text-caption text-on-surface-variant">{card.label}</Text>
      <View className="flex-row items-center justify-between gap-2">
        <Text
          className="font-manrope-extrabold text-[28px] leading-[34px] tracking-[-0.6px] text-on-surface"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {card.amount}
        </Text>
        <Badge label={card.chip.label} variant={card.chip.tone} />
      </View>
      {card.statusLine ? (
        <Text className={`font-manrope-semibold text-caption ${STATUS_TONE[card.statusLine.tone]}`}>
          {card.statusLine.text}
        </Text>
      ) : null}
    </Card>
  );
}
