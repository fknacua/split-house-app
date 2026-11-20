import { View } from 'react-native';

import { SkeletonBlock } from '@/components';

/** While the sheet loads (not drawn): blocks in the shape of From, the For list, Amount received and Received on. */
export function RecordPaymentSkeleton() {
  return (
    <View className="gap-4" accessibilityLabel="Loading">
      <View className="gap-1.5">
        <SkeletonBlock className="h-5 w-12" />
        <SkeletonBlock className="h-12 rounded-xl" />
      </View>
      <View className="gap-1.5">
        <SkeletonBlock className="h-5 w-10" />
        <SkeletonBlock className="h-40 rounded-xl" />
      </View>
      <View className="gap-1.5">
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="h-12 rounded-xl" />
      </View>
      <View className="gap-1.5">
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-12 rounded-xl" />
      </View>
    </View>
  );
}
