import { View } from 'react-native';

import { Card, SkeletonBlock } from '@/components';

const LABELS = [0, 1, 2];

/** The loading state of the template editor: Applies to, the message, its chips, and the line labels card. */
export function TemplateSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="gap-4 px-4 pt-2">
      <View className="gap-1.5">
        <SkeletonBlock className="h-3.5 w-20" />
        <SkeletonBlock className="h-12" />
      </View>
      <View className="gap-1.5">
        <SkeletonBlock className="h-3.5 w-16" />
        <SkeletonBlock className="h-40" />
      </View>
      <Card padded={false} className="gap-4 p-4">
        {LABELS.map((label) => (
          <View key={label} className="gap-1.5">
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="h-12" />
          </View>
        ))}
      </Card>
    </View>
  );
}
