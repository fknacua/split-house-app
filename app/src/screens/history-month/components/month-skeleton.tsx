import { View } from 'react-native';

import { Card, SkeletonBlock, SkeletonCard } from '@/components';

/** Loading state of the month detail: the bill card, the Payments heading and a card of rows. */
export function MonthSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="gap-3.5"
    >
      <SkeletonCard className="h-24" />
      <View className="gap-1.5">
        <SkeletonBlock className="mx-1 h-[18px] w-24" />
        <Card padded={false}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View
              key={i}
              className={`gap-2 px-4 py-[11px] ${i === 0 ? '' : 'border-t border-outline-variant'}`}
            >
              <View className="flex-row justify-between gap-2">
                <SkeletonBlock className="h-4" width="50%" />
                <SkeletonBlock className="h-4 w-14" />
              </View>
              <View className="flex-row justify-between gap-2">
                <SkeletonBlock className="h-3" width="40%" />
                <SkeletonBlock className="h-5 w-20 rounded-full" />
              </View>
            </View>
          ))}
        </Card>
      </View>
    </View>
  );
}
