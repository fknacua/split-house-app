import { View } from 'react-native';

import type { RoomFactsProps } from '../types';
import { ViewRow } from './view-row';

/** A room's read-only values, two to a row. */
export function RoomFacts({ facts }: RoomFactsProps) {
  return (
    <View className="flex-row flex-wrap gap-x-3 gap-y-4">
      {facts.map((fact) => (
        <ViewRow key={fact.label} row={fact} half />
      ))}
    </View>
  );
}
