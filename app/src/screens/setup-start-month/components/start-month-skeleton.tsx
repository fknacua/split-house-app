import { View } from 'react-native';

import { Card, SkeletonBlock } from '@/components';

const CARDS = [0, 1, 2];

/** The loading state of Start month (not drawn): three card-height blocks with the kicker and the month. */
export function StartMonthSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="gap-3 px-4 pt-2">
      {CARDS.map((card) => (
        <Card key={card} className="min-h-24 justify-center gap-2">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-4 w-40" />
        </Card>
      ))}
    </View>
  );
}
