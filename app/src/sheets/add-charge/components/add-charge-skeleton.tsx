import { Text, View } from 'react-native';

import { FormField, SkeletonBlock } from '@/components';
import type { AddChargeSkeletonProps } from '../types';

/** Charge mode's fields while loading, from the `empty` state. */
const CHARGE_FIELDS = ['What’s it for', 'Amount (SGD)', 'Due date'];

/** Correction mode's fields while loading, from `correctionFromCharge`. */
const CORRECTION_FIELDS = ['Person', 'Month', 'Charge', 'New amount (SGD)', 'Due date'];

/**
 * While the sheet loads (not drawn, deviations V63 and V78): the opening state's layout at the same heights, so nothing
 * moves when the data arrives. The real labels over 48px blocks for each field; Charge mode then adds the Split
 * preview heading over the placeholder box's height.
 */
export function AddChargeSkeleton({ correction }: AddChargeSkeletonProps) {
  return (
    <View className="gap-3.5" accessibilityLabel="Loading">
      {(correction ? CORRECTION_FIELDS : CHARGE_FIELDS).map((label) => (
        <FormField key={label} label={label} required>
          <SkeletonBlock className="h-12 rounded-xl" />
        </FormField>
      ))}
      {correction ? null : (
        <View className="gap-2">
          <Text className="font-manrope-bold text-label text-on-surface">Split preview</Text>
          <SkeletonBlock className="h-[72px] rounded-alert" />
        </View>
      )}
    </View>
  );
}
