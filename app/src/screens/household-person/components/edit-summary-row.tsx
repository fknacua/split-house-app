import { ArrowRight } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Icon } from '@/components';
import type { EditSummaryRowProps } from '../types';

/**
 * One change in the summary card: the label, the old value struck through, an arrow and the new value. With no old
 * value (a room added), only the new value shows.
 */
export function EditSummaryRow({ row }: EditSummaryRowProps) {
  return (
    <View className="flex-row items-center justify-between gap-2">
      <Text className="shrink font-manrope-medium text-label text-on-surface-variant">{row.label}</Text>
      <View className="shrink flex-row flex-wrap items-center justify-end gap-1.5">
        {row.from !== null ? (
          <>
            <Text
              className="font-manrope-medium text-label text-on-surface-variant line-through"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {row.from}
            </Text>
            <Icon as={ArrowRight} size={14} className="text-on-surface-variant" />
          </>
        ) : null}
        <Text className="font-manrope-extrabold text-label text-on-surface" style={{ fontVariant: ['tabular-nums'] }}>
          {row.to}
        </Text>
      </View>
    </View>
  );
}
