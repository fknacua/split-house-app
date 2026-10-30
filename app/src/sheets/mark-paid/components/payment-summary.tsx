import { Text, View } from 'react-native';

import { SkeletonBlock } from '@/components';
import type { PaymentSummaryProps } from '../types';

/** The tinted box at the top of the sheet: the expected amount on the left, the due day on the right. */
export function PaymentSummary({ sheet }: PaymentSummaryProps) {
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-container px-3.5 py-2.5">
      <View className="gap-0.5">
        <Text className="font-manrope-semibold text-caption text-on-surface-variant">Expected</Text>
        {sheet ? (
          <Text
            className="font-manrope-extrabold text-sheet-title text-on-surface"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {sheet.expected}
          </Text>
        ) : (
          <SkeletonBlock className="h-7 w-24" />
        )}
      </View>
      {sheet?.due ? (
        <View className="items-end gap-0.5">
          <Text className="font-manrope-semibold text-caption text-on-surface-variant">Due</Text>
          <Text
            className={`font-manrope-bold text-label ${sheet.due.tone === 'danger' ? 'text-danger' : 'text-on-surface'}`}
          >
            {sheet.due.text}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
