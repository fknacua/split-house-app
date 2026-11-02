import { View } from 'react-native';

import { SkeletonBlock } from '@/components';
import type { SplitSkeletonRowProps } from '../types';

/** A "Household split" row while loading: blocks for the label and total, the bar and the legend. */
export function SplitSkeletonRow({ separated }: SplitSkeletonRowProps) {
  return (
    <View className={`gap-2.5 py-3 ${separated ? 'border-t border-outline-variant' : ''}`}>
      <View className="flex-row items-center justify-between gap-2">
        <SkeletonBlock className="h-3.5 w-18" />
        <SkeletonBlock className="h-3 w-26" />
      </View>
      <SkeletonBlock className="h-2 rounded-full" />
      <View className="flex-row flex-wrap justify-between gap-y-1.5">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-3" width="48%" />
        ))}
      </View>
    </View>
  );
}
