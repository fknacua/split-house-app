import { UserPlus } from 'lucide-react-native';
import { Text } from 'react-native';

import { Button, Card } from '@/components';
import type { PeopleEmptyCardProps } from '../types';

/** People's `empty` state: the card with `No people yet` and an outline `Add person`. */
export function PeopleEmptyCard({ text, add, onOpen }: PeopleEmptyCardProps) {
  return (
    <Card className="items-center gap-3 px-4 py-5">
      <Text className="font-manrope-semibold text-label text-on-surface-variant">{text}</Text>
      <Button label={add.label} variant="outline" icon={UserPlus} onPress={() => onOpen(add.target)} />
    </Card>
  );
}
