import { Text, View } from 'react-native';

import { Card } from '@/components';
import type { SplitSectionProps } from '../types';
import { SplitRow } from './split-row';

/** "Household split": the heading and a card with a row for rent, utilities and aircon. */
export function SplitSection({ rows }: SplitSectionProps) {
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="px-1 font-manrope-bold text-label text-on-surface">
        Household split
      </Text>
      <Card padded={false} className="px-3.5">
        {rows.map((row, i) => (
          <SplitRow key={row.label} row={row} separated={i > 0} />
        ))}
      </Card>
    </View>
  );
}
