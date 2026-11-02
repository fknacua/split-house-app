import { View } from 'react-native';

import { SkeletonBlock } from '@/components';

/** The loading state of a person's Edit and View screens: two groups of field-sized blocks. */
export function PersonSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="gap-4 px-4 pt-3">
      <SkeletonBlock className="h-5 w-32" />
      <SkeletonBlock className="h-12" />
      <SkeletonBlock className="h-12" />
      <SkeletonBlock className="mt-4 h-5 w-32" />
      <SkeletonBlock className="h-12" />
      <View className="flex-row gap-3">
        <SkeletonBlock className="h-12 flex-1" />
        <SkeletonBlock className="h-12 flex-1" />
      </View>
      <View className="flex-row gap-3">
        <SkeletonBlock className="h-12 flex-1" />
        <SkeletonBlock className="h-12 flex-1" />
      </View>
    </View>
  );
}
