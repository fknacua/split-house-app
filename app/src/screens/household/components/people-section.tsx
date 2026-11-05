import { UserPlus } from 'lucide-react-native';
import { View } from 'react-native';

import type { PeopleSectionProps } from '../types';
import { HouseholdCard } from './household-card';
import { TabHeading } from './tab-heading';

/** The People tab: the heading with Add subtenant, then everyone's cards. */
export function PeopleSection({ people, add, onOpen }: PeopleSectionProps) {
  return (
    <View className="gap-2">
      <TabHeading title="People" actionLabel={add.label} actionIcon={UserPlus} onAction={() => onOpen(add.target)} />
      {people.map((person) => (
        <HouseholdCard key={person.personId} card={person} onOpen={onOpen} />
      ))}
    </View>
  );
}
