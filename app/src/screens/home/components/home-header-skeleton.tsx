import { View } from 'react-native';

import { SkeletonBlock } from '@/components';

/** Stands in for the month title while Home loads. Same 56px row as `PageHeader`. */
export function HomeHeaderSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="h-14 justify-center pl-4"
    >
      <SkeletonBlock className="h-6 w-44" />
    </View>
  );
}
