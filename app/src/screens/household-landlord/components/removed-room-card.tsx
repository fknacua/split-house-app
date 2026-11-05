import { Text, View } from 'react-native';

import { Button, Card } from '@/components';
import type { RemovedRoomCardProps } from '../types';

/** A room marked with Remove room. It only goes when Save is pressed, so there is no dialog, and Undo brings it back. */
export function RemovedRoomCard({ name, onUndo }: RemovedRoomCardProps) {
  return (
    <Card padded={false} className="gap-3.5 px-4 py-3.5">
      <Text accessibilityRole="header" className="font-manrope-bold text-label text-on-surface">
        {name}
      </Text>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="min-w-0 flex-1 font-manrope-semibold text-label text-on-surface-variant">Removed when you save</Text>
        <Button label="Undo" variant="outline" size="small" onPress={onUndo} />
      </View>
    </Card>
  );
}
