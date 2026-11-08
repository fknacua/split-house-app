import { View } from 'react-native';

import { SkeletonBlock, SkeletonPersonCards } from '@/components';

/** People's loading state (not drawn): the heading's block and two person cards, as `list` lays them out. */
export function PeopleSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="gap-2 px-4 pt-2">
      <SkeletonBlock className="mx-1 h-4 w-16" />
      <SkeletonPersonCards count={2} />
    </View>
  );
}
