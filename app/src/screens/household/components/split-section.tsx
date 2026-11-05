import { Pencil } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button, Card } from '@/components';
import type { SplitSectionProps } from '../types';
import { SplitRow } from './split-row';

/**
 * "Household split": the heading with Edit splits, and a card with a row for rent, utilities and
 * aircon. Edit splits opens the split page.
 */
export function SplitSection({ rows, edit, onOpen }: SplitSectionProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-2 px-1">
        <Text accessibilityRole="header" className="font-manrope-bold text-label text-on-surface">
          Household split
        </Text>
        <Button
          label={edit.label}
          variant="ghost"
          size="small"
          icon={Pencil}
          onPress={() => onOpen(edit.target)}
          className="-my-3 -mr-1 px-1"
        />
      </View>
      <Card padded={false} className="px-3.5">
        {rows.map((row, i) => (
          <SplitRow key={row.label} row={row} separated={i > 0} />
        ))}
      </Card>
    </View>
  );
}
