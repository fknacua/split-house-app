import { Text, View } from 'react-native';

import { Accordion, Card } from '@/components';
import type { HomeChargesProps } from '../types';
import { HomeRowContent } from './home-row-content';
import { HomeRowHeader } from './home-row-header';

/** The Charges list: a card of expandable rows, one per charge, ordered by due date. Rows that need attention start open. */
export function HomeCharges({ rows }: HomeChargesProps) {
  return (
    <View>
      <View className="flex-row items-baseline justify-between px-1 pb-1.5">
        <Text accessibilityRole="header" className="font-manrope-bold text-body text-on-surface">
          Charges
        </Text>
        <Text className="font-manrope-semibold text-caption text-on-surface-variant">By due date</Text>
      </View>
      <Card padded={false}>
        <Accordion
          multiple
          defaultOpen={rows.filter((row) => row.expanded).map((row) => row.id)}
          rows={rows.map((row) => ({
            value: row.id,
            header: <HomeRowHeader row={row} />,
            content: <HomeRowContent row={row} />,
            accessibilityLabel: `${row.title}, ${row.amount}`,
            className: row.tint === 'info' ? 'bg-info-tint' : undefined,
          }))}
        />
      </Card>
    </View>
  );
}
