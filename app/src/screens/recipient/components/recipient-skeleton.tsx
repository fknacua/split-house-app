import { View } from 'react-native';

import { Card, SkeletonBlock } from '@/components';

const LINE_WIDTHS = ['40%', '72%', '58%', '30%'] as const;

/** Loading state of Recipient (not drawn): blocks in the shape of the amount card and the message. */
export function RecipientSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="gap-3">
      <Card padded={false} className="gap-1.5 px-4 pb-3.5 pt-3">
        <SkeletonBlock className="h-3 w-24" />
        <View className="flex-row items-center justify-between">
          <SkeletonBlock className="h-8 w-40 rounded-[10px]" />
          <SkeletonBlock className="h-5 w-18 rounded-full" />
        </View>
        <SkeletonBlock className="h-3" width="62%" />
      </Card>
      <View className="gap-2">
        <View className="min-h-11 justify-center gap-1.5 pl-1">
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-3 w-40" />
        </View>
        <Card padded={false} className="gap-2.5 px-3.5 py-3">
          <SkeletonBlock className="h-3.5" width="80%" />
          {LINE_WIDTHS.map((width, i) => (
            <View key={i} className="flex-row justify-between">
              <SkeletonBlock className="h-3.5" width={width} />
              <SkeletonBlock className="h-3.5 w-14" />
            </View>
          ))}
          <SkeletonBlock className="h-3.5" width="50%" />
        </Card>
      </View>
    </View>
  );
}
