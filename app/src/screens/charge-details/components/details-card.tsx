import { Text, View } from 'react-native';

import { Badge, Card } from '@/components';
import type { DetailsCardProps } from '../types';

/** Label and value rows: Payer, Payment routing, Due, and Payment status as a pill. */
export function DetailsCard({ facts }: DetailsCardProps) {
  return (
    <Card padded={false} className="px-3.5">
      {facts.map((fact, i) => (
        <View
          key={fact.label}
          className={`min-h-11 flex-row items-center justify-between gap-3 ${i === 0 ? '' : 'border-t border-outline-variant'}`}
        >
          <Text className="font-manrope-semibold text-label text-on-surface-variant">{fact.label}</Text>
          {fact.kind === 'pill' ? (
            <Badge label={fact.badge.label} variant={fact.badge.tone} className="self-center" />
          ) : (
            <Text className="shrink text-right font-manrope-bold text-label text-on-surface">{fact.value}</Text>
          )}
        </View>
      ))}
    </Card>
  );
}
