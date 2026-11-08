import { Text, View } from 'react-native';

import { Card, CountInput, MoneyInput } from '@/components';
import type { LandlordFieldsProps } from '../types';

/** The Rent card: the landlord rent, the day it is paid and the optional utilities bill due day. */
export function LandlordFields({ control, errors }: LandlordFieldsProps) {
  return (
    <Card padded={false} className="gap-3.5 px-4 py-3.5">
      <Text accessibilityRole="header" className="font-manrope-bold text-label text-on-surface">
        Rent
      </Text>
      <MoneyInput
        placeholder="0.00"
        fieldControlProps={{
          control,
          name: 'landlordRentCents',
          label: 'Rent amount (SGD)',
          required: true,
          error: errors.landlordRentCents,
        }}
      />
      <View className="flex-row items-start gap-3">
        <CountInput
          kind="day"
          placeholder="e.g. 1st"
          fieldControlProps={{
            control,
            name: 'landlordDueDay',
            label: 'Rent due date',
            required: true,
            error: errors.landlordDueDay,
            className: 'min-w-0 flex-1',
          }}
        />
        <CountInput
          kind="day"
          placeholder="Optional"
          fieldControlProps={{
            control,
            name: 'billDueDay',
            label: 'Utilities due date',
            error: errors.billDueDay,
            className: 'min-w-0 flex-1',
          }}
        />
      </View>
    </Card>
  );
}
