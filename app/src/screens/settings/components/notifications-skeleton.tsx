import { View } from 'react-native';

import { Card, SkeletonBlock } from '@/components';

/** The text widths of the four loading rows, so they don't look identical. */
const ROW_WIDTHS = [
  ['w-40', 'w-48'],
  ['w-44', 'w-60'],
  ['w-36', 'w-56'],
  ['w-28', 'w-64'],
] as const;

/** Loading state of the Notifications card: four rows of a name and a detail line, with the switch's place. */
export function NotificationsSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Card padded={false}>
        {ROW_WIDTHS.map(([name, detail], i) => (
          <View
            key={name + detail}
            className={`min-h-16 flex-row items-center gap-3 py-2.5 pl-4 pr-3.5 ${
              i > 0 ? 'border-t border-outline-variant' : ''
            }`}
          >
            <View className="flex-1 gap-1.5">
              <SkeletonBlock className={`h-3.5 ${name}`} />
              <SkeletonBlock className={`h-3 ${detail}`} />
            </View>
            <SkeletonBlock className="h-8 w-[52px] rounded-full" />
          </View>
        ))}
      </Card>
    </View>
  );
}
