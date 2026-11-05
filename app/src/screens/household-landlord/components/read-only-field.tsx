import { Text, View } from 'react-native';

import { FormField } from '@/components';
import type { ReadOnlyFieldProps } from '../types';

/** A label above a value that can't be typed in, as tall as an input so it lines up beside one. */
export function ReadOnlyField({ label, value, error, className }: ReadOnlyFieldProps) {
  return (
    <FormField label={label} error={error} className={className}>
      <View className="min-h-12 justify-center">
        <Text
          className={`font-manrope-medium text-field ${error ? 'text-danger' : 'text-on-surface'}`}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {value}
        </Text>
      </View>
    </FormField>
  );
}
