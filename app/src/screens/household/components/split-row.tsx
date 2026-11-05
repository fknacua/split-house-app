import { CircleMinus } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Icon } from '@/components';
import type { SplitRowProps } from '../types';
import { PersonSplitBar } from './person-split-bar';
import { SplitLegendItem } from './split-legend-item';

/** One row of "Household split": the label and total, the bar with a segment per person, the legend, and who is not in the total. */
export function SplitRow({ row, separated }: SplitRowProps) {
  return (
    <View className={`gap-2.5 py-3 ${separated ? 'border-t border-outline-variant' : ''}`}>
      <View className="flex-row items-baseline justify-between gap-2">
        <Text className="font-manrope-bold text-label text-on-surface">{row.label}</Text>
        <Text className="font-manrope-semibold text-caption text-on-surface-variant">{row.detail}</Text>
      </View>
      <PersonSplitBar segments={row.segments} accessibilityLabel={row.accessibilityLabel} />
      <View className="flex-row flex-wrap justify-between gap-y-1.5">
        {row.segments.map((segment) => (
          <SplitLegendItem key={segment.personId} segment={segment} />
        ))}
      </View>
      {row.note ? (
        <View className="flex-row items-center gap-1.5">
          <Icon as={CircleMinus} size={14} className="text-on-surface-variant" />
          <Text className="min-w-0 flex-1 font-manrope-semibold text-caption text-on-surface-variant">{row.note}</Text>
        </View>
      ) : null}
    </View>
  );
}
