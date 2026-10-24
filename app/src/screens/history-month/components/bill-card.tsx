import { Text, View } from 'react-native';

import { Badge, Card } from '@/components';
import type { BillCardProps } from '../types';

/** The month's utilities bill: the Current Charges amount and, once paid, its badge. */
export function BillCard({ bill }: BillCardProps) {
  return (
    <Card>
      <View className="flex-row items-start justify-between gap-2">
        <View className="gap-0.5">
          <Text className="font-manrope-semibold text-caption text-on-surface-variant">
            Utilities bill · Current Charges
          </Text>
          <Text
            className="font-manrope-extrabold text-[28px] leading-[34px] text-on-surface"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {bill.amount}
          </Text>
        </View>
        {bill.badge ? <Badge label={bill.badge.label} variant={bill.badge.tone} /> : null}
      </View>
    </Card>
  );
}
