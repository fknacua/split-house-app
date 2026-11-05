import { Pencil } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Card, Icon, SkeletonBlock, SkeletonCard, SkeletonPersonCards } from '@/components';
import { SplitSkeletonRow } from './split-skeleton-row';

/** The `loading` state, matching the loaded layout: the rent card, the split card, four person cards and Add subtenant. */
export function HouseholdSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="gap-4">
      <SkeletonCard className="h-40 rounded-dialog" />
      <View className="gap-2">
        <View className="flex-row items-center justify-between gap-2 px-1">
          <Text className="font-manrope-bold text-label text-on-surface">Household split</Text>
          <View className="flex-row items-center gap-1.5">
            <Icon as={Pencil} size={16} className="text-on-surface" />
            <Text className="font-manrope-bold text-label text-on-surface">Edit splits</Text>
          </View>
        </View>
        <Card padded={false} className="px-3.5">
          {[0, 1, 2].map((i) => (
            <SplitSkeletonRow key={i} separated={i > 0} />
          ))}
        </Card>
      </View>
      <View className="gap-2">
        <Text className="px-1 font-manrope-bold text-label text-on-surface">People</Text>
        <SkeletonPersonCards count={4} />
      </View>
      <SkeletonBlock className="h-12 rounded-full" />
    </View>
  );
}
