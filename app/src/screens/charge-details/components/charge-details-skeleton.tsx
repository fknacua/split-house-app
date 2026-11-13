import { View } from 'react-native';

import { Card, SkeletonBlock } from '@/components';

const FACT_WIDTHS = [72, 64, 96, 60] as const;
const ACTIVITY_WIDTHS = ['36%', '48%'] as const;

/** Loading state of Charge details (not drawn): blocks in the shape of the Amount, Details and Activity cards. */
export function ChargeDetailsSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="gap-3">
      <View className="gap-1.5">
        <SkeletonBlock className="h-4 w-16" />
        <Card padded={false} className="min-h-16 flex-row items-center justify-between px-3.5 py-2.5">
          <SkeletonBlock className="h-6 w-28 rounded-[10px]" />
          <SkeletonBlock className="h-5 w-24 rounded-full" />
        </Card>
      </View>
      <View className="gap-1.5">
        <SkeletonBlock className="h-4 w-16" />
        <Card padded={false} className="px-3.5">
          {FACT_WIDTHS.map((width, i) => (
            <View
              key={i}
              className={`min-h-11 flex-row items-center justify-between ${i === 0 ? '' : 'border-t border-outline-variant'}`}
            >
              <SkeletonBlock className="h-3.5 w-24" />
              <SkeletonBlock className="h-3.5" width={width} />
            </View>
          ))}
        </Card>
      </View>
      <View className="gap-1.5">
        <SkeletonBlock className="h-4 w-16" />
        <Card padded={false} className="px-3.5">
          {ACTIVITY_WIDTHS.map((width, i) => (
            <View
              key={i}
              className={`min-h-11 flex-row items-center justify-between ${i === 0 ? '' : 'border-t border-outline-variant'}`}
            >
              <SkeletonBlock className="h-3.5" width={width} />
              <SkeletonBlock className="h-3.5 w-24" />
            </View>
          ))}
        </Card>
      </View>
    </View>
  );
}
