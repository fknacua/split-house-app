import { Text, View } from 'react-native';

import { Card } from '@/components';
import type { HistoryGroupSectionProps } from '../types';
import { HistoryMonthRow } from './history-month-row';

/** One year of the History list: the year label above a card of month rows. */
export function HistoryGroupSection({ group }: HistoryGroupSectionProps) {
  return (
    <View className="gap-2">
      <Text className="mx-1 mt-2 font-manrope-bold text-label text-on-surface-variant">
        {group.year}
      </Text>
      <Card padded={false}>
        {group.months.map((month, i) => (
          <HistoryMonthRow key={month.month} month={month} separated={i > 0} />
        ))}
      </Card>
    </View>
  );
}
