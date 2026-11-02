import { useController } from 'react-hook-form';
import { Text, View } from 'react-native';

import { PERSON_COLOR_BG } from '@/lib';
import type { ColorFieldProps } from '../types';
import { ColorSwatch } from './color-swatch';

/** The Color row: the label with the picked color's dot and name, then the swatches, four to a row. */
export function ColorField({ control, swatches, fallbackName }: ColorFieldProps) {
  const { field } = useController({ control, name: 'color' });
  const name = swatches.find((swatch) => swatch.color === field.value)?.name ?? fallbackName;

  return (
    <View className="gap-2.5">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="font-manrope-bold text-label text-on-surface">Color</Text>
        <View className="flex-row items-center gap-2">
          <View className={`size-3 rounded-full ${PERSON_COLOR_BG[field.value]}`} />
          <Text className="font-manrope-semibold text-label text-on-surface">{name}</Text>
        </View>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Color" className="flex-row flex-wrap gap-y-3">
        {swatches.map((swatch) => (
          <ColorSwatch
            key={swatch.color}
            color={swatch.color}
            name={swatch.name}
            selected={swatch.color === field.value}
            onPress={() => field.onChange(swatch.color)}
          />
        ))}
      </View>
    </View>
  );
}
