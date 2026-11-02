import { Pencil } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components';
import type { LandlordCardProps } from '../types';
import { LandlordStat } from './landlord-stat';

/**
 * The card at the top of Household, in the selected tone: the Edit badge and the stat tiles. The whole
 * card is the edit target, and does nothing until Landlord & rooms is built (9.9).
 */
export function LandlordCard({ stats, edit }: LandlordCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Edit landlord rent and rooms"
      className="gap-3 rounded-dialog bg-selected px-4.5 py-4"
    >
      <View className="flex-row gap-1.5 self-end rounded-full bg-background px-3 py-1.5">
        <Icon as={Pencil} size={14} className="text-on-selected" />
        <Text className="font-manrope-bold text-caption text-on-selected">{edit.label}</Text>
      </View>
      <View className="flex-row gap-2">
        {stats.map((stat) => (
          <LandlordStat key={stat.label} stat={stat} />
        ))}
      </View>
    </Pressable>
  );
}
