import { Text, View } from 'react-native';

import { Badge } from '@/components';
import type { PaymentRowProps } from '../types';

/**
 * One charge on the month detail: title and amount, then its detail line and status badge. A
 * warning badge (Unpaid) tints the row; a negative amount (a credit) is drawn in the success colour.
 */
export function PaymentRow({ payment, separated }: PaymentRowProps) {
  const unpaid = payment.badge.tone === 'warning';
  const credit = payment.amount.startsWith('-');

  return (
    <View
      className={`gap-[3px] px-4 py-[11px] ${unpaid ? 'bg-warning-tint' : ''} ${
        separated ? 'border-t border-outline-variant' : ''
      }`}
    >
      <View className="flex-row justify-between gap-2">
        <Text className="min-w-0 flex-1 font-manrope-bold text-body text-on-surface">
          {payment.title}
        </Text>
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
        <Badge label={payment.badge.label} variant={payment.badge.tone} />
      </View>
    </View>
  );
}
