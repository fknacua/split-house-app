import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Badge, Card, Icon } from '@/components';
import type { BillCardProps } from '../types';

/** The month's utilities bill: the Current Charges amount, its badge once paid, and a link to View bill. */
export function BillCard({ month, bill }: BillCardProps) {
  return (
    <Card className="gap-1.5 pb-1">
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
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push({ pathname: '/bill/[month]', params: { month } })}
        className="min-h-11 flex-row items-center gap-1 self-start active:opacity-70"
      >
        <Text className="font-manrope-bold text-label text-on-surface">View bill</Text>
        <Icon as={ArrowRight} size={16} className="text-on-surface" />
      </Pressable>
    </Card>
  );
}
