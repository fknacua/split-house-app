import { Text, View } from 'react-native';

import { Pressable } from '@/components/ui/pressable';

// gluestack v5 has no chip component — custom, per the screen mapping doc.
export function ChipGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { label: string; value: T }[];
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={
              'min-h-9 rounded-full px-4 py-2 ' +
              (isSelected ? 'bg-selected' : 'bg-container')
            }
          >
            <Text
              className={
                'font-manrope-semibold text-label ' +
                (isSelected ? 'text-on-selected' : 'text-on-surface-variant')
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
