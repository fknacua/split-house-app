import { View } from 'react-native';

import { SkeletonBlock } from '@/components';
import type { HistorySkeletonRowProps } from '../types';

/** Placeholder for one month row: name, detail line, chip and chevron. */
export function HistorySkeletonRow({
  nameWidth,
  detailWidth,
  chipWidth,
  separated,
}: HistorySkeletonRowProps) {
  return (
    <View
      className={`min-h-[72px] flex-row items-center gap-3 py-3 pl-4 pr-2.5 ${
        separated ? 'border-t border-outline-variant' : ''
      }`}
    >
      <View className="min-w-0 flex-1 gap-1.5">
        <SkeletonBlock className="h-[18px]" width={nameWidth} />
        <SkeletonBlock className="h-3" width={detailWidth} />
        <SkeletonBlock className="h-5 rounded-full" width={chipWidth} />
      </View>
      <SkeletonBlock className="h-5 w-5" />
    </View>
  );
}
