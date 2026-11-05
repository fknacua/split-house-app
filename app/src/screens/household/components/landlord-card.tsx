import { Pencil } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components';
import type { LandlordCardProps } from '../types';
import { LandlordStat } from './landlord-stat';

/**
 * The card at the top of Household, in the selected tone: the landlord rent and its due day, the Edit
 * badge and the stat tiles. The whole card is the edit target, and opens Landlord & rooms.
 */
export function LandlordCard({ label, amount, stats, edit, onOpen }: LandlordCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Edit landlord rent and rooms"
      onPress={() => onOpen(edit.target)}
      className="gap-3 rounded-dialog bg-selected px-4.5 py-4"
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="font-manrope-semibold text-caption text-on-selected">{label}</Text>
          <Text
            className="font-manrope-extrabold text-hero text-on-selected"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {amount}
          </Text>
        </View>
        <View className="flex-row gap-1.5 rounded-full bg-background px-3 py-1.5">
          <Icon as={Pencil} size={14} className="text-on-selected" />
          <Text className="font-manrope-bold text-caption text-on-selected">{edit.label}</Text>
        </View>
      </View>
      <View className="flex-row gap-2">
        {stats.map((stat) => (
          <LandlordStat key={stat.label} stat={stat} />
        ))}
      </View>
    </Pressable>
  );
}
