import { Text, View } from 'react-native';

import { FormField } from '@/components';
import type { AmountFieldProps } from '../types';

/**
 * Amount received, read-only: always the ticked charges' total, since each is paid in full. Under it
 * the expected line (`Expected $X · 2 charges`) and, with two or more ticked, the paid-in-full note.
 */
export function AmountField({ amount, hasTicks, disabled }: AmountFieldProps) {
  return (
    <FormField label="Amount received" required disabled={disabled}>
      <View
        accessible
        accessibilityLabel={`Amount received, ${amount.value}`}
        className={`h-12 justify-center rounded-field border border-outline-variant px-3.5 ${
          disabled ? 'bg-disabled' : 'bg-background'
        }`}
      >
        <Text
          className={`font-manrope-medium text-field ${hasTicks && !disabled ? 'text-on-surface' : 'text-on-disabled'}`}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {amount.value}
        </Text>
      </View>
      {amount.expected ? (
        <Text className="mt-1.5 font-manrope-semibold text-caption text-on-surface-variant">{amount.expected}</Text>
      ) : null}
      {amount.note ? (
        <Text className="mt-1.5 font-manrope-semibold text-caption text-on-surface-variant">{amount.note}</Text>
      ) : null}
    </FormField>
  );
}
