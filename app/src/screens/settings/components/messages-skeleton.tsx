import { View } from 'react-native';

import { Card, SkeletonBlock } from '@/components';

/** Loading state of the Messages card: two rows of a name and a detail line. */
export function MessagesSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Card padded={false}>
        <View className="min-h-16 justify-center gap-1.5 py-2.5 pl-4 pr-2.5">
          <SkeletonBlock className="h-3.5 w-36" />
          <SkeletonBlock className="h-3 w-28" />
        </View>
        <View className="min-h-16 justify-center gap-1.5 border-t border-outline-variant py-2.5 pl-4 pr-2.5">
          <SkeletonBlock className="h-3.5 w-16" />
          <SkeletonBlock className="h-3 w-32" />
        </View>
      </Card>
    </View>
  );
}
