import { Text, View } from 'react-native';

import { FormField, SkeletonBlock } from '@/components';

/**
 * While the sheet loads (not drawn, deviation V63): the `empty` state's layout at the same heights, so nothing moves
 * when the data arrives. The real labels over 48px blocks for What it’s for, the Amount and the Due date, then the
 * Split preview heading over the placeholder box's height.
 */
export function AddChargeSkeleton() {
  return (
    <View className="gap-3.5" accessibilityLabel="Loading">
      <FormField label="What’s it for" required>
        <SkeletonBlock className="h-12 rounded-xl" />
      </FormField>
      <FormField label="Amount (SGD)" required>
        <SkeletonBlock className="h-12 rounded-xl" />
      </FormField>
      <FormField label="Due date" required>
        <SkeletonBlock className="h-12 rounded-xl" />
      </FormField>
      <View className="gap-2">
        <Text className="font-manrope-bold text-label text-on-surface">Split preview</Text>
        <SkeletonBlock className="h-[72px] rounded-alert" />
      </View>
    </View>
  );
}
