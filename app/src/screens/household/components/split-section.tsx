import { Pencil } from 'lucide-react-native';
import { View } from 'react-native';

import { Card } from '@/components';
import type { SplitSectionProps } from '../types';
import { SplitRow } from './split-row';
import { TabHeading } from './tab-heading';

/**
 * The Split tab: the heading with Edit splits, and a card with a row for rent, utilities and
 * aircon. Edit splits opens the split page.
 */
export function SplitSection({ rows, edit, onOpen }: SplitSectionProps) {
  return (
    <View className="gap-2">
      <TabHeading title="Household split" actionLabel={edit.label} actionIcon={Pencil} onAction={() => onOpen(edit.target)} />
      <Card padded={false} className="px-3.5">
        {rows.map((row, i) => (
          <SplitRow key={row.label} row={row} separated={i > 0} />
        ))}
      </Card>
    </View>
  );
}
