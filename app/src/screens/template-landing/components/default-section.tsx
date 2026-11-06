import { Pencil } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Card, LinkButton, MessagePreview } from '@/components';
import type { DefaultSectionProps } from '../types';
import { SectionHeading } from './section-heading';

/** The Default: what everyone without a custom template gets, with Edit and its preview. */
export function DefaultSection({ section, onEdit }: DefaultSectionProps) {
  return (
    <View className="gap-2">
      <SectionHeading
        title={section.title}
        sub={section.sub}
        action={<LinkButton label="Edit" icon={Pencil} onPress={onEdit} />}
      />
      <Card padded={false} className="gap-1.5 px-4 py-3.5">
        {section.preview ? (
          <MessagePreview message={section.preview} />
        ) : (
          <Text className="font-manrope-medium text-caption text-on-surface-variant">Nothing to preview yet</Text>
        )}
      </Card>
    </View>
  );
}
