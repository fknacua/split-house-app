import { Text, View } from 'react-native';

import { Card } from '@/components';
import type { FactsCardProps } from '../types';

/** Label and value rows: Bill month, Billing period, Due date and, once paid, You paid. */
export function FactsCard({ facts }: FactsCardProps) {
  return (
    <Card padded={false} className="px-4 py-1">
      {facts.map((fact, i) => (
        <View
          key={fact.label}
          className={`min-h-11 flex-row items-center justify-between gap-2 ${i === 0 ? '' : 'border-t border-outline-variant'}`}
        >
          <Text className="font-manrope-medium text-body text-on-surface-variant">{fact.label}</Text>
          <Text className="font-manrope-bold text-body text-on-surface">{fact.value}</Text>
        </View>
      ))}
    </Card>
  );
}
