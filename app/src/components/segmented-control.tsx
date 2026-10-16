import { Text, View } from 'react-native';

import { Pressable } from '@/components/ui/pressable';

// gluestack v5 has no segmented control. Tech Stack doc's fallback: a plain
// Pressable row (the Radio-restyling approach was skipped for the spike).
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { label: string; value: T }[];
}) {
  return (
    <View className="flex-row rounded-full bg-container p-1">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={
              'min-h-9 flex-1 items-center justify-center rounded-full px-3 py-2 ' +
              (isActive ? 'bg-card' : '')
            }
          >
            <Text
              className={
                'font-manrope-bold text-label ' +
                (isActive ? 'text-foreground' : 'text-on-surface-variant')
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
