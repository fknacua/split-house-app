import { Pencil } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Card, LinkButton } from '@/components';
import { sectionLabelOf, toSectionLabels } from '../helpers';
import type { SectionLabelsCardProps } from '../types';

/**
 * The section labels in use, one row per section, with `Edit` beside the title opening the Section labels sheet. Sits
 * between the message and the preview, set and forget: compact, out of the way of the text.
 */
export function SectionLabelsCard({ block, disabled, onEdit }: SectionLabelsCardProps) {
  const saved = toSectionLabels(block);
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-2 px-1">
        <Text accessibilityRole="header" className="font-manrope-bold text-label text-on-surface">
          {block.title}
        </Text>
        <LinkButton label="Edit" icon={Pencil} disabled={disabled} onPress={onEdit} />
      </View>
      <Card padded={false} className="gap-1.5 px-3.5 py-3">
        {block.rows.map((row) => (
          <View key={row.personId} className="flex-row justify-between gap-3">
            <Text className="shrink font-manrope-medium text-caption text-on-surface-variant">{row.label}</Text>
            <Text className="shrink text-right font-manrope-semibold text-caption text-on-surface">
              {sectionLabelOf(saved, row)}
            </Text>
          </View>
        ))}
      </Card>
    </View>
  );
}
