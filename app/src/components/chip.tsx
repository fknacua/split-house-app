import { Text, View } from 'react-native';

import { Pressable } from '@/components/ui/pressable';

/**
 * Single-select chip group (gluestack v5 has no chip, so it is custom per the screen mapping
 * doc). The selected chip is filled with `primary`; the others are outlined. The border is
 * always 1px so selecting never shifts the layout, and there is no check icon.
 *
 * @param value - The selected option value.
 * @param onChange - Called with the tapped option's value.
 * @param options - The chips, in order.
 * @param disabled - Greys the chips and ignores taps (the saving state).
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
        const look = disabled
          ? isSelected
            ? 'border-track bg-track'
            : 'border-outline-variant bg-transparent'
          : isSelected
            ? 'border-primary bg-primary'
            : 'border-outline bg-transparent';
        const ink = disabled ? 'text-on-disabled' : isSelected ? 'text-on-primary' : 'text-on-surface';

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            className={
              'h-11 items-center justify-center rounded-[22px] border px-4 transition-colors duration-150 ' +
              look
            }
          >
            <Text className={'font-manrope-bold text-label transition-colors duration-150 ' + ink}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
