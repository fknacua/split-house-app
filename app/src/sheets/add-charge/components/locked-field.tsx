import { Lock } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Icon } from '@/components';
import type { LockedFieldProps } from '../types';

/**
 * A read-only field (`AddCharge` `correctionFromCharge`): the value in a 48px field with a quiet border and a lock,
 * where the Select would be, so Person, Month and Charge read as picked and fixed.
 */
export function LockedField({ value, accessibilityLabel }: LockedFieldProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${accessibilityLabel}: ${value}`}
      className="min-h-12 flex-row items-center gap-2 rounded-field border border-outline-variant bg-surface px-3.5"
    >
      <Text className="flex-1 font-manrope-medium text-field text-on-surface">{value}</Text>
      <Icon as={Lock} size={18} className="text-on-surface-variant" />
    </View>
  );
}
