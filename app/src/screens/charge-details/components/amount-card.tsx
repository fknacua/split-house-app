import { Text, View } from 'react-native';

import { Badge, Card } from '@/components';
import type { AmountCardProps } from '../types';

/** The amount of the one charge, its chip (the same as its Home row) and an optional note under them. */
export function AmountCard({ amount }: AmountCardProps) {
  return (
    <Card padded={false} className="min-h-16 justify-center gap-0.5 px-3.5 py-2.5">
      <View className="flex-row items-center gap-2">
        <Text
          className="flex-1 font-manrope-extrabold text-sheet-title text-on-surface"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {amount.value}
        </Text>
        <Badge label={amount.chip.label} variant={amount.chip.tone} className="self-center" />
      </View>
      {amount.note ? (
        <Text className="font-manrope-semibold text-caption text-on-surface-variant">{amount.note}</Text>
      ) : null}
    </Card>
  );
}
