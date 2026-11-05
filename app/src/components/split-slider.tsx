import { View } from 'react-native';

import { Slider as NativeSlider, SliderFilledTrack, SliderThumb, SliderTrack } from '@/components/ui/slider';
import { PERSON_COLOR_BG } from '@/lib/person-color';
import type { PersonColor } from '@splithouse/shared';

/**
 * The split control's slider, on a track in the two people's colors. A thin wrapper over the native gluestack slider
 * in `ui/slider`, which holds the look. It is 44px high, and inset by half its thumb so the thumb stays inside the
 * card at both ends. By default it runs in 1% steps from 0% to 100%.
 *
 * @param value - The left person's part.
 * @param onChange - Called with the left person's new part.
 * @param min - The lowest value.
 * @param max - The highest value.
 * @param step - The distance between stops.
 * @param leftColor - The left person's color, filling the track up to the thumb.
 * @param rightColor - The right person's color, filling the rest.
 * @param accessibilityLabel - What the slider sets, e.g. `Rent split, You share`.
 * @param disabled - Dims it and ignores touches.
 */
export function SplitSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  leftColor,
  rightColor,
  accessibilityLabel,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  leftColor: PersonColor;
  rightColor: PersonColor;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  return (
    <View className="mx-3.5 h-11 justify-center">
      <NativeSlider
        value={value}
        minValue={min}
        maxValue={max}
        step={step}
        isDisabled={disabled}
        onChange={(next: number) => onChange(Math.round(next))}
        aria-label={accessibilityLabel}
      >
        <SliderTrack className={PERSON_COLOR_BG[rightColor]}>
          <SliderFilledTrack className={`border-r-2 border-surface ${PERSON_COLOR_BG[leftColor]}`} />
        </SliderTrack>
        <SliderThumb />
      </NativeSlider>
    </View>
  );
}
