import { Text, View } from 'react-native';

import { Pressable } from '@/components/ui/pressable';

/** One option of a {@link RadioCardGroup}. */
export interface RadioCardOption<T extends string> {
  value: T;
  /** 15/22 bold. */
  title: string;
  /** 12/16 under the title. */
  detail: string;
  /** Shows the disabled look and ignores taps. */
  disabled?: boolean;
}

/**
 * A radio group drawn as a column of option cards (the Share board): at least 64px high, the ring
 * on the left, a title and a detail line. The chosen card has a 2px `primary` border on
 * `selected`, the others a 1px `outline` border; the padding gives back the extra pixel, so
 * choosing never shifts the layout. Custom on `Pressable`, as `ChipGroup` is: gluestack's `Radio`
 * root drew the cards broken and square on device.
 *
 * @param value - The chosen option's value.
 * @param onChange - Called with the tapped option's value.
 * @param options - The cards, in order.
 * @param label - Accessibility label for the group.
 */
export function RadioCardGroup<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly RadioCardOption<T>[];
  label: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className="gap-2">
      {options.map((option) => {
        const on = option.value === value;
        const disabled = option.disabled ?? false;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            className={[
              'min-h-16 flex-row items-center gap-3 rounded-option',
              on ? 'border-2 border-primary bg-selected px-3.25 py-2.25' : 'border border-outline px-3.5 py-2.5',
              disabled ? 'opacity-50' : '',
            ].join(' ')}
          >
            <View
              className={[
                'h-5 w-5 items-center justify-center rounded-full border-2',
                on ? 'border-primary' : 'border-outline',
              ].join(' ')}
            >
              {on ? <View className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="font-manrope-bold text-body text-on-surface">{option.title}</Text>
              <Text className="font-manrope-semibold text-caption text-on-surface-variant">{option.detail}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
