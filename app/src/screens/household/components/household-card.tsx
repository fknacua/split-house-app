import { Eye, Pencil } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button, Card } from '@/components';
import { PERSON_COLOR_BG } from '@/lib';
import type { HouseholdCardProps } from '../types';
import { PersonFact } from './person-fact';

/** A card on the People or Recurring tab: the colored initial and name, the facts, and the buttons. */
export function HouseholdCard({ card, onOpen }: HouseholdCardProps) {
  return (
    <Card padded={false} className="gap-2.5 py-3 pl-3.5 pr-3">
      <View className="flex-row items-center gap-3">
        <View className={`h-10 w-10 items-center justify-center rounded-full ${PERSON_COLOR_BG[card.color]}`}>
          <Text className="font-manrope-extrabold text-label text-on-person">{card.initial}</Text>
        </View>
        <Text className="min-w-0 flex-1 font-manrope-bold text-label text-on-surface">{card.name}</Text>
      </View>
      <View className="flex-row flex-wrap gap-x-3 gap-y-2 pr-1">
        {card.facts.map((fact) => (
          <PersonFact key={fact.label} fact={fact} />
        ))}
      </View>
      {card.actions.length > 0 ? (
        <View className="-mx-0.5 flex-row flex-wrap justify-end gap-2 border-t border-outline-variant pt-2">
          {card.actions.map((action) => (
            <Button
              key={action.label}
              label={action.label}
              variant="outline"
              size="small"
              icon={action.target.kind === 'view-person' ? Eye : Pencil}
              onPress={() => onOpen(action.target)}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}
