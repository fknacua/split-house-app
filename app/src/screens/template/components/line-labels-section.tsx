import { Text, View } from 'react-native';

import { Card, TextInput } from '@/components';
import type { LineLabelsSectionProps } from '../types';

/** How each charge is named: the title and note above a card with a field per charge. Holds the whole household's labels. */
export function LineLabelsSection({ lineLabels, control, errors }: LineLabelsSectionProps) {
  return (
    <View className="gap-2">
      <View className="gap-0.5 px-1">
        <Text accessibilityRole="header" className="font-manrope-bold text-label text-on-surface">
          {lineLabels.title}
        </Text>
        <Text className="font-manrope-semibold text-caption text-on-surface-variant">{lineLabels.note}</Text>
      </View>
      <Card padded={false} className="gap-4 p-4">
        {lineLabels.rows.map((row) => (
          <TextInput
            key={row.type}
            fieldControlProps={{
              control,
              name: `lineLabels.${row.type}`,
              label: row.label,
              error: errors[`lineLabels.${row.type}`],
            }}
          />
        ))}
      </Card>
    </View>
  );
}
