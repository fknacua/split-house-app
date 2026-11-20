import { View } from 'react-native';

import { SkeletonBlock } from '@/components';

/** While the sheet loads (not drawn, deviation V31): blocks in the shape of To, the amount card and the message card. */
export function SendMessageSkeleton() {
  return (
    <View className="gap-4" accessibilityLabel="Loading">
      <View className="gap-1.5">
        <SkeletonBlock className="h-5 w-8" />
        <SkeletonBlock className="h-12 rounded-xl" />
      </View>
      <View className="gap-1.5">
        <SkeletonBlock className="h-5 w-16" />
        <SkeletonBlock className="h-16 rounded-xl" />
      </View>
      <View className="gap-1.5">
        <SkeletonBlock className="h-5 w-20" />
        <SkeletonBlock className="h-40 rounded-2xl" />
      </View>
    </View>
  );
}
