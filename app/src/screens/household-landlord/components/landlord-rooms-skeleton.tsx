import { View } from 'react-native';

import { Card, SkeletonBlock } from '@/components';

const CARDS = [0, 1, 2];

/** The loading state of Landlord & rooms: the heading, then cards of field-sized blocks. */
export function LandlordRoomsSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="gap-3 px-4 pt-2">
      <SkeletonBlock className="m-1 h-3.5 w-36" />
      {CARDS.map((card) => (
        <Card key={card} padded={false} className="gap-3.5 px-4 py-3.5">
          <SkeletonBlock className="h-3.5 w-24" />
          <SkeletonBlock className="h-12" />
          <View className="flex-row gap-3">
            <SkeletonBlock className="h-12 flex-1" />
            <SkeletonBlock className="h-12 flex-1" />
          </View>
        </Card>
      ))}
    </View>
  );
}
