import { Text, View } from 'react-native';

import type { PaymentRowsProps } from '../types';

/** From, For and Amount received: read-only rows in a card the page colour, as the board draws them. */
export function PaymentRows({ rows }: PaymentRowsProps) {
  return (
    <View className="rounded-xl bg-background px-3.5">
      {rows.map((row, i) => (
        <View
          key={row.label}
          className={`min-h-11 flex-row items-center justify-between gap-3 ${i === 0 ? '' : 'border-t border-outline-variant'}`}
        >
          <Text className="font-manrope-semibold text-label text-on-surface-variant">{row.label}</Text>
          <Text className="shrink text-right font-manrope-bold text-label text-on-surface">{row.value}</Text>
        </View>
      ))}
    </View>
  );
}
