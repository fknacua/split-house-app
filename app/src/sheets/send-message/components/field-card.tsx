import { Text, View } from 'react-native';

import type { FieldCardProps } from '../types';

/**
 * A labelled card in the sheet: the 14px bold label above a 12px-radius card. In light the card takes the
 * page colour against the white sheet, in dark the surface, as the board draws it.
 */
export function FieldCard({ label, children }: FieldCardProps) {
  return (
    <View className="gap-1.5">
      <Text className="font-manrope-bold text-label text-on-surface">{label}</Text>
      <View className="rounded-xl bg-background px-3.5 dark:bg-surface">{children}</View>
    </View>
  );
}
