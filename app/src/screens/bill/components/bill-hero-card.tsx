import { Text, View } from 'react-native';

import { Badge, Card } from '@/components';
import type { BillHeroCardProps } from '../types';

/** The top card: Current Charges with its due or paid chip, then the bill's lines. */
export function BillHeroCard({ hero }: BillHeroCardProps) {
  return (
    <Card className="gap-3.5">
      <View className="flex-row items-start justify-between gap-2">
        <View className="gap-0.5">
          <Text className="font-manrope-semibold text-caption text-on-surface-variant">Current Charges</Text>
          <Text
            className="font-manrope-extrabold text-hero tracking-[-1px] text-on-surface"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {hero.amount}
          </Text>
        </View>
        <Badge label={hero.badge.label} variant={hero.badge.tone} className="mt-1" />
      </View>
      {hero.lines.length > 0 ? (
        <View className="gap-1.5">
          {hero.lines.map((line, i) => (
            <View key={line.label + i} className="flex-row justify-between gap-2">
              <Text className="font-manrope-medium text-body text-on-surface-variant">{line.label}</Text>
              <Text
                className="font-manrope-bold text-body text-on-surface"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {line.amount}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
