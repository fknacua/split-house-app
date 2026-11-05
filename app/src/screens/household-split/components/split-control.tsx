import { Text, View } from 'react-native';

import { SplitSlider } from '@/components';
import { bpsFromOwnerPercent, bpsFromPrimaryPercent, ownerPercentOf, primaryPercentOf, sliderPercentOf } from '../helpers';
import type { SplitControlProps } from '../types';
import { FieldMessage } from './field-message';
import { SplitField } from './split-field';

/** The Rent slider's stops. Anything finer is typed in the percent fields. */
const SLIDER_STEP_PERCENT = 10;

/**
 * The Rent split control: a slider in 10% steps on a track in the two people's colors, and a percent field for each
 * that updates the other, so they always add to 100%. Either can be at 0, with a warning. Amounts come from the server.
 */
export function SplitControl({ title, cardTitle, owner, primary, bps, savedBps, onChange, amount, error, warning }: SplitControlProps) {
  const ownerPercent = ownerPercentOf(bps);
  const primaryPercent = primaryPercentOf(bps);
  return (
    <View className="gap-1.5 pt-1.5">
      <Text className="font-manrope-bold text-label text-on-surface">{title}</Text>
      <SplitSlider
        value={sliderPercentOf(bps, savedBps)}
        step={SLIDER_STEP_PERCENT}
        onChange={(percent) => onChange(bpsFromOwnerPercent(percent))}
        leftColor={owner.color}
        rightColor={primary.color}
        accessibilityLabel={`${cardTitle} split, ${owner.name} share`}
      />
      <View className="flex-row items-start gap-3">
        <SplitField
          kind="whole"
          suffix="%"
          name={owner.name}
          color={owner.color}
          value={ownerPercent}
          onChange={(percent) => onChange(bpsFromOwnerPercent(percent))}
          amount={amount.owner}
          invalid={!!error}
          warned={!!warning && ownerPercent === 0}
        />
        <SplitField
          kind="whole"
          suffix="%"
          name={primary.name}
          color={primary.color}
          value={primaryPercent}
          onChange={(percent) => onChange(bpsFromPrimaryPercent(percent))}
          amount={amount.primary ?? '—'}
          invalid={!!error}
          warned={!!warning && primaryPercent === 0}
        />
      </View>
      <FieldMessage error={error} warning={warning} />
    </View>
  );
}
