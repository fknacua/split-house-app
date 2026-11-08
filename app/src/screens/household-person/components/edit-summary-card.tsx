import { Text, View } from 'react-native';

import { Card, Spinner } from '@/components';
import type { EditSummaryCardProps } from '../types';
import { EditSummaryRow } from './edit-summary-row';

/**
 * The card above Save: what the edit would change, in the server's groups ("Saves now", "Saves from
 * Jan 2027"); in First run one group with no title. Hidden when there is nothing to show, with a Spinner while a
 * newer answer is on its way.
 */
export function EditSummaryCard({ groups, loading }: EditSummaryCardProps) {
  if (groups.length === 0 && !loading) return null;

  return (
    <Card padded={false} className="mb-1.5 gap-1.5 px-3.5 py-2.5">
      {groups.length === 0 ? <Spinner accessibilityLabel="Checking your changes" /> : null}
      {groups.map((group, index) => (
        <View key={group.title ?? index} className="gap-1.5">
          {group.title ? (
            <Text accessibilityRole="header" className="pt-0.5 font-manrope-bold text-caption text-on-surface-variant">
              {group.title}
            </Text>
          ) : null}
          {group.rows.map((row) => (
            <EditSummaryRow key={row.label} row={row} />
          ))}
        </View>
      ))}
      {groups.length > 0 && loading ? (
        <View className="absolute right-3.5 top-2.5">
          <Spinner accessibilityLabel="Checking your changes" />
        </View>
      ) : null}
    </Card>
  );
}
