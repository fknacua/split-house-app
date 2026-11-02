import { Eye, Pencil } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button, Card } from '@/components';
import { PERSON_COLOR_BG } from '@/lib';
import type { PersonCardProps } from '../types';
import { PersonFact } from './person-fact';

/** One person on Household: the colored initial, name and sub line, their facts, and the View and Edit buttons. */
export function PersonCard({ person, onOpen }: PersonCardProps) {
  return (
    <Card padded={false} className="gap-2.5 py-3 pl-3.5 pr-3">
      <View className="flex-row items-center gap-3">
        <View className={`h-10 w-10 items-center justify-center rounded-full ${PERSON_COLOR_BG[person.color]}`}>
          <Text className="font-manrope-extrabold text-label text-on-person">{person.initial}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-manrope-bold text-label text-on-surface">{person.name}</Text>
          <Text className="font-manrope-semibold text-caption text-on-surface-variant">{person.sub}</Text>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-x-3 gap-y-2 pr-1">
        {person.facts.map((fact) => (
          <PersonFact key={fact.label} fact={fact} />
        ))}
      </View>
      {person.actions.length > 0 ? (
        <View className="-mx-0.5 flex-row flex-wrap justify-end gap-2 border-t border-outline-variant pt-2">
          {person.actions.map((action) => (
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
