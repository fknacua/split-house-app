import { UserPlus } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button, Card, LinkButton } from '@/components';
import type { CustomSectionProps } from '../types';
import { CustomTemplateCard } from './custom-template-card';
import { SectionHeading } from './section-heading';

/**
 * Custom templates: a card per person who has one, with Add more beside the title (disabled once everyone has one),
 * or the empty card with `Add custom template` when nobody has one yet.
 */
export function CustomSection({ section, onEdit, onAdd }: CustomSectionProps) {
  const empty = section.cards.length === 0;
  return (
    <View className="gap-2">
      <SectionHeading
        title={section.title}
        action={
          empty ? null : <LinkButton label="Add more" icon={UserPlus} disabled={!section.canAdd} onPress={onAdd} />
        }
      />
      {empty ? (
        <Card padded={false} className="items-center gap-3 px-4 py-5">
          <Text className="font-manrope-semibold text-label text-on-surface-variant">No custom templates yet</Text>
          <Button label="Add custom template" variant="outline" icon={UserPlus} onPress={onAdd} />
        </Card>
      ) : (
        section.cards.map((card) => (
          <CustomTemplateCard key={card.personId} card={card} onEdit={() => onEdit(card.personId)} />
        ))
      )}
    </View>
  );
}
