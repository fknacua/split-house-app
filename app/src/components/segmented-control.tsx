import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

/**
 * Joined, outlined single-select group (gluestack v5 has none, so it is custom per the
 * screen mapping doc). The selected segment shows a check icon.
 *
 * @param value - The selected option value.
 * @param onChange - Called with the tapped option's value.
 * @param options - The segments, in order.
 * @param disabled - Dims the group and ignores taps (the saving state).
 * @param fit - Size segments to their label (min 72px) instead of sharing the width equally.
 * @param label - Accessibility label for the group.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  disabled = false,
  fit = false,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { label: string; value: T }[];
  disabled?: boolean;
  fit?: boolean;
  label?: string;
}) {
  const line = disabled ? 'border-outline-variant' : 'border-outline';

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className={'flex-row self-stretch overflow-hidden rounded-full border ' + line}
    >
      {options.map((option, index) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            className={
              'h-11 flex-row items-center justify-center gap-1.5 ' +
              (fit ? 'min-w-[72px] px-3.5 ' : 'min-w-0 flex-1 ') +
              (index > 0 ? 'border-l ' + line + ' ' : '') +
              (isActive ? 'bg-selected' : '')
            }
          >
            {isActive ? (
              <Icon
                as={Check}
                size="sm"
                className={disabled ? 'text-on-disabled' : 'text-on-selected'}
              />
            ) : null}
            <Text
              className={
                'font-manrope-bold text-label ' +
                (disabled
                  ? 'text-on-disabled'
                  : isActive
                    ? 'text-on-selected'
                    : 'text-on-surface')
              }
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
