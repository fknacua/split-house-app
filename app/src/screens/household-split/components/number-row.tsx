import { Text, View } from 'react-native';

import { CountInput } from '@/components';
import { PERSON_COLOR_BG } from '@/lib/person-color';
import type { NumberRowProps } from '../types';
import { FieldMessage } from './field-message';

/** A shares input on the Utilities card, with its label beside it as drawn and its message under it, on the right. */
export function NumberRow({ label, color, value, onChange, error, warning }: NumberRowProps) {
  return (
    <View className="gap-1">
      <View className="min-h-12 flex-row items-center gap-2.5">
        <View className={`h-2.5 w-2.5 rounded-full ${color ? PERSON_COLOR_BG[color] : ''}`} />
        <Text className="min-w-0 flex-1 font-manrope-semibold text-body text-on-surface">{label}</Text>
        <View className="w-32">
          <CountInput
            kind="shares"
            placeholder="0"
            alignRight
            value={value}
            onChange={onChange}
            invalid={!!error}
            warned={!!warning}
            accessibilityLabel={label}
          />
        </View>
      </View>
      <FieldMessage error={error} warning={warning} alignEnd />
    </View>
  );
}
