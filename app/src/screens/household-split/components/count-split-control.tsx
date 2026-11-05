import { Text, View } from 'react-native';

import { SplitSlider } from '@/components';
import { primaryCountFromOwner, primaryCountFromSlider, shownCounts, sliderCountOf, sliderRangeOf } from '../helpers';
import type { CountSplitControlProps } from '../types';
import { FieldMessage } from './field-message';
import { SplitField } from './split-field';

/**
 * The Utilities and Aircon split control: a slider in half steps and a count field for each person that updates the
 * other, so they always add up to what is left. Either can be at 0, with a warning. A count not typed comes from the
 * server. With nothing to split, the slider is disabled.
 */
export function CountSplitControl({
  title,
  cardTitle,
  unit,
  owner,
  primary,
  typed,
  counts,
  onChange,
  error,
  warning,
  dimmed,
}: CountSplitControlProps) {
  const shown = shownCounts(typed, counts);
  const range = sliderRangeOf(counts.left);
  const sliderLabel = `${cardTitle} split, ${owner.name} ${unit}`;

  return (
    <View className={`gap-1.5 pt-1.5 ${dimmed ? 'opacity-40' : ''}`}>
      <Text className="font-manrope-bold text-label text-on-surface">{title}</Text>
      {range ? (
        <SplitSlider
          value={sliderCountOf(shown.owner, counts, range)}
          min={range.min}
          max={range.max}
          step={range.step}
          onChange={(count) => onChange(primaryCountFromSlider(count, counts.left))}
          leftColor={owner.color}
          rightColor={primary.color}
          accessibilityLabel={sliderLabel}
        />
      ) : (
        <SplitSlider
          value={50}
          onChange={() => {}}
          leftColor={owner.color}
          rightColor={primary.color}
          accessibilityLabel={sliderLabel}
          disabled
        />
      )}
      <View className="flex-row items-start gap-3">
        <SplitField
          kind="shares"
          suffix={unit}
          name={owner.name}
          color={owner.color}
          value={shown.owner}
          onChange={(count) => onChange(primaryCountFromOwner(count, counts.left))}
          invalid={!!error}
          warned={!!warning && shown.owner === 0}
        />
        <SplitField
          kind="shares"
          suffix={unit}
          name={primary.name}
          color={primary.color}
          value={shown.primary}
          onChange={onChange}
          invalid={!!error}
          warned={!!warning && shown.primary === 0}
        />
      </View>
      <FieldMessage error={error} warning={warning} />
    </View>
  );
}
