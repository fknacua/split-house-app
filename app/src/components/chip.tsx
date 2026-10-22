import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

/**
 * Single-select chip group (gluestack v5 has no chip, so it is custom per the screen
 * mapping doc). The selected chip is filled and shows a check icon; the others are outlined.
 *
 * @param value - The selected option value.
 * @param onChange - Called with the tapped option's value.
 * @param options - The chips, in order.
 * @param disabled - Dims the chips and ignores taps (the saving state).
 * @param label - Accessibility label for the group.
 */
export function ChipGroup<T extends string>({
  value,
  onChange,
  options,
  disabled = false,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { label: string; value: T }[];
  disabled?: boolean;
  label?: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            className={
              'h-11 flex-row items-center gap-1.5 rounded-full border px-3.5 ' +
              (isSelected
                ? 'border-transparent bg-selected'
                : disabled
                  ? 'border-outline-variant'
                  : 'border-outline')
            }
          >
            {isSelected ? (
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
                  : isSelected
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
