import { Text, View } from 'react-native';

import { Alert, MoneyInput } from '@/components';
import type { CustomAmountsProps } from '../types';

/**
 * Custom's amount fields (`AddCharge` `custom`, `customOver`): `Amounts`, one money field per person labelled by the
 * server (`Sam · via Priya`), starting from the Equal split, and the warning Alert while they don't add up to the
 * total. The split preview follows under them (V66).
 */
export function CustomAmounts({ custom, disabled, onChange }: CustomAmountsProps) {
  return (
    <View className="gap-2.5">
      <Text className="font-manrope-bold text-label text-on-surface">{custom.heading}</Text>
      {custom.rows.map((row) => (
        <View key={row.personId} className="gap-1.5">
          <Text className="font-manrope-semibold text-caption text-on-surface-variant">{row.label}</Text>
          <MoneyInput
            accessibilityLabel={`Amount for ${row.label}`}
            placeholder="0.00"
            value={row.amountCents}
            onChange={(cents) => onChange(row.personId, cents)}
            disabled={disabled}
          />
        </View>
      ))}
      {custom.alert ? <Alert variant="warning" message={custom.alert} /> : null}
    </View>
  );
}
