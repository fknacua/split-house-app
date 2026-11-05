import { Text, View } from 'react-native';

import { CountInput } from '@/components';
import { PERSON_COLOR_BG } from '@/lib/person-color';
import type { SplitFieldProps } from '../types';

/** One person's side of a split control: the label with their color, the percent or count, and what it comes to. */
export function SplitField({ kind, suffix, name, color, value, onChange, amount, invalid, warned }: SplitFieldProps) {
  return (
    <View className="min-w-0 flex-1 gap-1.5">
      <View className="flex-row items-center gap-2">
        <View className={`h-2.5 w-2.5 rounded-full ${PERSON_COLOR_BG[color]}`} />
        <Text className="min-w-0 flex-1 font-manrope-bold text-label text-on-surface">{name}</Text>
      </View>
      <CountInput
        kind={kind}
        suffix={suffix}
        alignRight
        placeholder="—"
        value={value}
        onChange={onChange}
        invalid={invalid}
        warned={warned}
        accessibilityLabel={`${name} ${suffix === '%' ? 'percent' : suffix}`}
      />
      {amount ? (
        <Text className="font-manrope-bold text-label text-on-surface" style={{ fontVariant: ['tabular-nums'] }}>
          {amount}
        </Text>
      ) : null}
    </View>
  );
}
