import { Text, View } from 'react-native';

import type { HistoryCardProps } from '../types';
import { FieldCard } from './field-card';

/** When the message, or a nudge about a ticked charge, went out before: `Sent` / `Sent again` or `Nudged` / `Nudged again`, with dates. */
export function HistoryCard({ history }: HistoryCardProps) {
  return (
    <FieldCard label={history.title}>
      {history.rows.map((row, i) => (
        <View
          key={i}
          className={`min-h-11 flex-row items-center justify-between ${i === 0 ? '' : 'border-t border-outline-variant'}`}
        >
          <Text className="font-manrope-semibold text-label text-on-surface-variant">{row.label}</Text>
          <Text className="font-manrope-bold text-label text-on-surface">{row.date}</Text>
        </View>
      ))}
    </FieldCard>
  );
}
