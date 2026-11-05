import { Text, View } from 'react-native';

import { Button } from '@/components';
import type { PlaceholderChipsProps } from '../types';

/** The Insert row: a small outline button per placeholder, which puts it at the cursor. */
export function PlaceholderChips({ placeholders, onInsert }: PlaceholderChipsProps) {
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <Text className="pr-0.5 font-manrope-bold text-label text-on-surface-variant">Insert</Text>
      {placeholders.map((placeholder) => (
        <Button
          key={placeholder}
          label={placeholder}
          variant="outline"
          size="small"
          onPress={() => onInsert(placeholder)}
        />
      ))}
    </View>
  );
}
