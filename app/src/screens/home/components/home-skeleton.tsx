import { View } from 'react-native';

import { SkeletonBlock, SkeletonCard, SkeletonRowList } from '@/components';

/** Loading state of Home: the hero card, the Charges heading and five placeholder rows. */
export function HomeSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="gap-4"
    >
      <SkeletonCard className="h-[258px]" />
      <View className="gap-1.5">
        <SkeletonBlock className="mx-1 h-[18px] w-20" />
        <SkeletonRowList count={5} />
      </View>
    </View>
  );
}
