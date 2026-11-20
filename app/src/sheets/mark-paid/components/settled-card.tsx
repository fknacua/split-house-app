import { Text, View } from 'react-native';

import type { SettledCardProps } from '../types';

/** `RecordPayment` `settled`: the card in place of the fields once nobody has anything left to pay. */
export function SettledCard({ settled }: SettledCardProps) {
  return (
    <View className="items-center gap-1 rounded-card bg-background px-4 py-6">
      <Text className="text-center font-manrope-bold text-body text-on-surface">{settled.title}</Text>
      <Text className="text-center font-manrope-semibold text-label text-on-surface-variant">{settled.text}</Text>
    </View>
  );
}
