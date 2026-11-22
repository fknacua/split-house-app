import { View } from 'react-native';

import { FormField, SkeletonBlock } from '@/components';

/** Label and value widths for the three rows, so they don't look identical. */
const ROW_WIDTHS = [
  ['w-12', 'w-20'],
  ['w-8', 'w-32'],
  ['w-28', 'w-16'],
] as const;

/**
 * While the sheet loads (not drawn, deviation V55): the loaded layout at the same heights, so nothing
 * moves when the data arrives. The read-only rows card with a label and a value block per 44px row,
 * the real `Received on` label over a 48px block, and a block in the 44px Remove payment row.
 */
export function EditPaymentSkeleton() {
  return (
    <View className="gap-4" accessibilityLabel="Loading">
      <View className="rounded-xl bg-background px-3.5">
        {ROW_WIDTHS.map(([label, value], i) => (
          <View
            key={label + value}
            className={`min-h-11 flex-row items-center justify-between gap-3 ${i === 0 ? '' : 'border-t border-outline-variant'}`}
          >
            <SkeletonBlock className={`h-4 ${label}`} />
            <SkeletonBlock className={`h-4 ${value}`} />
          </View>
        ))}
      </View>
      <FormField label="Received on" required>
        <SkeletonBlock className="h-12 rounded-xl" />
      </FormField>
      <View className="h-11 items-center justify-center">
        <SkeletonBlock className="h-4 w-36" />
      </View>
    </View>
  );
}
