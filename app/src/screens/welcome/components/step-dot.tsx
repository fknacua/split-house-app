import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Icon } from '@/components';
import type { StepDotProps } from '../types';

/**
 * The round 32px marker in front of a Welcome row: a check when done, the number filled for the
 * current step, an outlined number for a later (disabled) step.
 *
 * Each state is its own element with its own `key`, so a row that changes state is mounted fresh
 * (restyling one View from no fill to a fill lost the rounded corners on device, as on Returning).
 */
export function StepDot({ number, state }: StepDotProps) {
  if (state === 'done') {
    return (
      <View
        key="done"
        className="h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-success-container bg-success-container"
      >
        <Icon as={Check} size={16} strokeWidth={2.5} className="text-on-success-container" />
      </View>
    );
  }
  if (state === 'current') {
    return (
      <View
        key="current"
        className="h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary"
      >
        <Text className="font-manrope-extrabold text-label text-on-primary">{number}</Text>
      </View>
    );
  }
  return (
    <View
      key="disabled"
      className="h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-outline-variant"
    >
      <Text className="font-manrope-extrabold text-label text-on-disabled">{number}</Text>
    </View>
  );
}
