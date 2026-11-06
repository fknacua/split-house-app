import { View } from 'react-native';

import { Card, SkeletonBlock } from '@/components';

const CHIPS = [0, 1, 2, 3];

/** The loading state of the template editor: the message, the Insert chips, and the preview card. */
export function TemplateSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="gap-4 px-4 pt-2">
      <View className="gap-2">
        <View className="gap-1.5">
          <SkeletonBlock className="h-3.5 w-16" />
          <SkeletonBlock className="h-40" />
        </View>
        <View className="flex-row flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <SkeletonBlock key={chip} className="h-11 w-20 rounded-full" />
          ))}
        </View>
      </View>
      <View className="gap-2">
        <SkeletonBlock className="h-3.5 w-16" />
        <Card padded={false} className="gap-1.5 px-3.5 py-3">
          <SkeletonBlock className="h-3.5" />
          <SkeletonBlock className="h-3.5" />
          <SkeletonBlock className="h-3.5 w-1/2" />
        </Card>
      </View>
    </View>
  );
}
