import { Text, View } from 'react-native';

import type { ConfirmDetailRowProps } from '../types';

/** One label and value row in the confirm dialog's details box; every row but the first has a divider above it. */
export function ConfirmDetailRow({ label, value, first = false }: ConfirmDetailRowProps) {
  return (
    <View
      className={`flex-row items-baseline justify-between gap-3 py-2.5 ${first ? '' : 'border-t border-outline-variant'}`}
    >
      <Text className="font-manrope-semibold text-label text-on-surface-variant">{label}</Text>
      <Text
        className="shrink text-right font-manrope-bold text-label text-on-surface"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
    </View>
  );
}
