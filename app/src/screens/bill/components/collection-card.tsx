import { Text, View } from 'react-native';

import { Card, Progress } from '@/components';
import type { CollectionCardProps } from '../types';
import { PersonRow } from './person-row';

/** How much of the bill is collected, as text and a bar, then a row per person. */
export function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <Card className="gap-3 pb-1.5">
      <View className="gap-2">
        <View className="flex-row items-baseline justify-between gap-2">
          <Text className="font-manrope-bold text-label text-on-surface">{collection.title}</Text>
          <Text
            className="font-manrope-semibold text-caption text-on-surface-variant"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {collection.note}
          </Text>
        </View>
        <Progress
          value={collection.percent}
          accessibilityLabel={`${collection.title}: ${collection.note}`}
          className="h-1.5"
        />
      </View>
      <View>
        {collection.people.map((person) => (
          <PersonRow key={person.id} person={person} />
        ))}
      </View>
    </Card>
  );
}
