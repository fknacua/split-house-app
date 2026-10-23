import { View, type DimensionValue } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading placeholders (screen mapping doc: Skeleton). Blocks use the `container` token and the
 * native gluestack pulse. Screens compose these while a query is loading, so the layout does not
 * jump when the data arrives.
 */

/**
 * One placeholder block. Size it with `className` (for example `h-4 w-24`); the radius defaults
 * to a small round, use `rounded-full` for pills and avatars.
 *
 * @param className - Size and shape classes.
 * @param width - Width as a percentage or number, for the sample row widths a class cannot express.
 */
export function SkeletonBlock({
  className,
  width,
}: {
  className?: string;
  width?: DimensionValue;
}) {
  return (
    <Skeleton
      startColor="bg-container"
      className={`h-4 w-full rounded-lg ${className ?? ''}`}
      style={width === undefined ? undefined : { width }}
    />
  );
}

/**
 * A full-width placeholder for a hero or summary card (Home hero, Household landlord card).
 *
 * @param className - Height class, for example `h-64`. Defaults to 160px.
 */
export function SkeletonCard({ className = 'h-40' }: { className?: string }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SkeletonBlock className={`rounded-card ${className}`} />
    </View>
  );
}

/** Width pairs for the two text lines of each row, so the rows do not look identical. */
const ROW_WIDTHS: [DimensionValue, DimensionValue][] = [
  ['58%', '44%'],
  ['50%', '62%'],
  ['66%', '70%'],
  ['44%', '38%'],
  ['52%', '48%'],
];

/**
 * A list of charge-style rows inside one card: date block, two text lines with an amount and a
 * badge, and a trailing chevron (Home Charges, History months, View bill lines).
 *
 * @param count - How many rows to draw. Defaults to 5.
 */
export function SkeletonRowList({ count = 5 }: { count?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="overflow-hidden rounded-card bg-surface"
    >
      {Array.from({ length: count }).map((_, i) => {
        const [w1, w2] = ROW_WIDTHS[i % ROW_WIDTHS.length];
        return (
          <View
            key={i}
            className={`min-h-16 flex-row items-center gap-3 py-3 pl-3.5 pr-2.5 ${
              i === 0 ? '' : 'border-t border-outline-variant'
            }`}
          >
            <View className="w-10 items-center gap-1">
              <SkeletonBlock className="h-5 w-6" />
              <SkeletonBlock className="h-2.5 w-5" />
            </View>
            <View className="flex-1 gap-2">
              <View className="flex-row items-center justify-between gap-2">
                <SkeletonBlock className="h-4" width={w1} />
                <SkeletonBlock className="h-4 w-14" />
              </View>
              <View className="flex-row items-center justify-between gap-2">
                <SkeletonBlock className="h-3" width={w2} />
                <SkeletonBlock className="h-5 w-18 rounded-full" />
              </View>
            </View>
            <SkeletonBlock className="h-5 w-5" />
          </View>
        );
      })}
    </View>
  );
}

/**
 * A stack of person-style cards: avatar and two text lines, a two-column grid of label and
 * value pairs, and a trailing action pill (Household people).
 *
 * @param count - How many cards to draw. Defaults to 3.
 */
export function SkeletonPersonCards({ count = 3 }: { count?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="gap-2"
    >
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="gap-2.5 rounded-card bg-surface py-3 pl-3.5 pr-3">
          <View className="flex-row items-center gap-3">
            <SkeletonBlock className="h-10 w-10 rounded-full" />
            <View className="flex-1 gap-1.5">
              <SkeletonBlock className="h-3.5 w-24" />
              <SkeletonBlock className="h-3 w-40" />
            </View>
          </View>
          <View className="flex-row flex-wrap gap-x-3 gap-y-2">
            {Array.from({ length: 4 }).map((__, j) => (
              <View key={j} className="w-[48%] gap-1.5">
                <SkeletonBlock className="h-3 w-18" />
                <SkeletonBlock className="h-3.5 w-26" />
              </View>
            ))}
          </View>
          <View className="items-end border-t border-outline-variant pt-2">
            <SkeletonBlock className="h-11 w-24 rounded-full" />
          </View>
        </View>
      ))}
    </View>
  );
}
