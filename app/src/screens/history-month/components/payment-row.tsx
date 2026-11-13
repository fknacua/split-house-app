import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Badge, Icon } from '@/components';
import type { PaymentRowProps } from '../types';

/**
 * One charge on the month detail: title and amount, then its detail line and status badge, and a
 * chevron. A tap opens the charge's Charge details. A warning badge (Unpaid) tints the row; a
 * negative amount (a credit) is drawn in the success colour.
 */
export function PaymentRow({ payment, separated }: PaymentRowProps) {
  const router = useRouter();
  const unpaid = payment.badge.tone === 'warning';
  const credit = payment.amount.startsWith('-');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${payment.title}, ${payment.amount}, ${payment.badge.label}`}
      onPress={() => router.push({ pathname: '/charge/[chargeId]', params: { chargeId: payment.chargeId } })}
      className={`flex-row items-center gap-2 py-[11px] pl-4 pr-3 active:opacity-70 ${unpaid ? 'bg-warning-tint' : ''} ${
        separated ? 'border-t border-outline-variant' : ''
      }`}
    >
      <View className="min-w-0 flex-1 gap-[3px]">
        <View className="flex-row justify-between gap-2">
          <Text className="min-w-0 flex-1 font-manrope-bold text-body text-on-surface">{payment.title}</Text>
          <Text
            className={`font-manrope-bold text-body ${credit ? 'text-success' : 'text-on-surface'}`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {payment.amount}
          </Text>
        </View>
        <View className="flex-row items-center justify-between gap-2">
          <Text className="min-w-0 flex-1 font-manrope-semibold text-caption text-on-surface-variant">
            {payment.details.join('\n')}
          </Text>
          <Badge label={payment.badge.label} variant={payment.badge.tone} className="self-center" />
        </View>
      </View>
      <Icon as={ChevronRight} className="text-on-surface-variant" />
    </Pressable>
  );
}
