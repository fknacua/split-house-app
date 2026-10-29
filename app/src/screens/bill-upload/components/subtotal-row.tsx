import { Text, View } from 'react-native';

import { formatCents } from '@splithouse/shared';
import type { SubtotalRowProps } from '../types';

/**
 * The bill's Subtotal under the lines, as read from the PDF. Shown for reference only: it is not a
 * line, so it is not added up, edited or saved. The lines are checked against it.
 */
export function SubtotalRow({ subtotalCents }: SubtotalRowProps) {
  return (
    <View className="flex-row items-center justify-between px-1">
      <Text className="font-manrope-semibold text-label text-on-surface-variant">Subtotal</Text>
      <Text className="font-manrope-bold text-label text-on-surface" style={{ fontVariant: ['tabular-nums'] }}>
        {formatCents(subtotalCents)}
      </Text>
    </View>
  );
}
