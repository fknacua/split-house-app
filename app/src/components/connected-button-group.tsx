import { Text, View } from 'react-native';

import { Pressable } from '@/components/ui/pressable';

/**
 * Connected button group (gluestack v5 has none, so it is custom per the screen mapping doc).
 * Separate buttons with a 2px gap; the selected one is a `primary` pill and the others keep
 * 24px outer / 8px inner corners. Sizes never change on selection.
 *
 * @param value - The selected option value.
 * @param onChange - Called with the tapped option's value.
 * @param options - The buttons, in order (two to four).
 * @param disabled - Greys the group and ignores taps (the saving state).
 * @param fit - Compact variant (44px high, min 72px wide, natural width) instead of equal widths at 48px.
 * @param label - Accessibility label for the group.
 */
export function ConnectedButtonGroup<T extends string>({
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
  const last = options.length - 1;

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className={'flex-row gap-0.5 ' + (fit ? 'self-start' : 'self-stretch')}
    >
      {options.map((option, index) => {
        const isActive = option.value === value;
        const corners = isActive
          ? 'rounded-tl-[24px] rounded-tr-[24px] rounded-br-[24px] rounded-bl-[24px]'
          : index === 0
            ? 'rounded-tl-[24px] rounded-bl-[24px] rounded-tr-[8px] rounded-br-[8px]'
            : index === last
              ? 'rounded-tl-[8px] rounded-bl-[8px] rounded-tr-[24px] rounded-br-[24px]'
              : 'rounded-tl-[8px] rounded-tr-[8px] rounded-br-[8px] rounded-bl-[8px]';
        const fill = disabled
          ? isActive
            ? 'bg-track'
            : 'bg-disabled'
          : isActive
            ? 'bg-primary'
            : 'bg-selected';
        const ink = disabled ? 'text-on-disabled' : isActive ? 'text-on-primary' : 'text-on-surface';

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            className={
              'items-center justify-center transition-colors duration-150 ' +
              (fit ? 'h-11 min-w-[72px] px-3.5 ' : 'h-12 min-w-0 flex-1 ') +
              corners +
              ' ' +
              fill
            }
          >
            <Text className={'text-center font-manrope-bold text-label transition-colors duration-150 ' + ink}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
