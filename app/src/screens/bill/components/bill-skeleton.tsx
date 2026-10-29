import { View } from 'react-native';

import { Card, SkeletonBlock } from '@/components';

const LINE_WIDTHS = ['30%', '22%', '26%'] as const;
const PERSON_WIDTHS = ['18%', '22%', '14%', '16%'] as const;
const FACT_WIDTHS = [90, 96, 104] as const;

/** Loading state of View bill (the `loading` board): blocks in place of the four cards. */
export function BillSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="gap-4"
    >
      <Card className="gap-3.5">
        <View className="flex-row items-start justify-between">
          <View className="gap-1.5">
            <SkeletonBlock className="h-3.5 w-[108px]" />
            <SkeletonBlock className="h-10 w-[168px] rounded-[10px]" />
          </View>
          <SkeletonBlock className="mt-1 h-6 w-24 rounded-full" />
        </View>
        <View className="gap-2.5">
          {LINE_WIDTHS.map((width, i) => (
            <View key={i} className="flex-row justify-between">
              <SkeletonBlock className="h-3.5" width={width} />
              <SkeletonBlock className="h-3.5 w-14" />
            </View>
          ))}
        </View>
      </Card>
      <Card className="gap-3 pb-1.5">
        <View className="gap-2.5">
          <View className="flex-row justify-between">
            <SkeletonBlock className="h-4 w-[120px]" />
            <SkeletonBlock className="h-3.5 w-24" />
          </View>
          <SkeletonBlock className="h-1.5 rounded-full" />
        </View>
        <View>
          {PERSON_WIDTHS.map((width, i) => (
            <View key={i} className="min-h-[52px] flex-row items-center gap-3 border-t border-outline-variant py-2">
              <View className="flex-1 gap-1.5">
                <SkeletonBlock className="h-3.5" width={width} />
                <SkeletonBlock className="h-3 w-[72px]" />
              </View>
              <SkeletonBlock className="h-3.5 w-14" />
              <SkeletonBlock className="h-6 w-[76px] rounded-full" />
            </View>
          ))}
        </View>
      </Card>
      <Card padded={false} className="px-4 py-1">
        {FACT_WIDTHS.map((width, i) => (
          <View
            key={i}
            className={`min-h-11 flex-row items-center justify-between ${i === 0 ? '' : 'border-t border-outline-variant'}`}
          >
            <SkeletonBlock className="h-3.5 w-[88px]" />
            <SkeletonBlock className="h-3.5" width={width} />
          </View>
        ))}
      </Card>
      <Card padded={false} className="flex-row items-center gap-3 py-3 pl-4 pr-2">
        <SkeletonBlock className="h-[52px] w-11 rounded-lg" />
        <View className="flex-1 gap-1.5">
          <SkeletonBlock className="h-3.5" width="70%" />
          <SkeletonBlock className="h-3" width="40%" />
        </View>
        <SkeletonBlock className="mr-3.5 h-3.5 w-11" />
      </Card>
    </View>
  );
}
