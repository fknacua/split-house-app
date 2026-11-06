import { View } from 'react-native';

import { Card, SkeletonBlock } from '@/components';

/** The loading state of the landing page: blocks in place of the Default and a custom template card, as drawn. */
export function LandingSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="gap-4">
      <View className="gap-2">
        <View className="flex-row items-center justify-between px-1">
          <View className="gap-1">
            <SkeletonBlock className="h-3.5 w-16" />
            <SkeletonBlock className="h-3 w-36" />
          </View>
          <SkeletonBlock className="h-3.5 w-14" />
        </View>
        <Card padded={false} className="gap-2.5 px-4 py-3.5">
          <SkeletonBlock className="h-3" width="90%" />
          <SkeletonBlock className="h-3" />
          <SkeletonBlock className="h-3" />
          <SkeletonBlock className="h-3" />
          <SkeletonBlock className="h-3" />
          <SkeletonBlock className="h-3" width="60%" />
        </Card>
      </View>
      <View className="gap-2">
        <View className="flex-row items-center justify-between px-1">
          <SkeletonBlock className="h-3.5 w-28" />
          <SkeletonBlock className="h-3.5 w-24" />
        </View>
        <Card padded={false} className="gap-2.5 px-4 py-3.5">
          <View className="flex-row items-center gap-3">
            <SkeletonBlock className="h-10 w-10 rounded-full" />
            <View className="gap-1.5">
              <SkeletonBlock className="h-3.5 w-20" />
              <SkeletonBlock className="h-3 w-28" />
            </View>
          </View>
          <SkeletonBlock className="h-3" />
          <SkeletonBlock className="h-3" />
          <SkeletonBlock className="h-3" />
          <SkeletonBlock className="h-3" width="70%" />
        </Card>
      </View>
    </View>
  );
}
