import { useController } from 'react-hook-form';
import { View } from 'react-native';

import { ConnectedButtonGroup, FormField, SelectField } from '@/components';
import type { RouteFieldProps } from '../types';

type RouteChoice = 'direct' | 'via';

const ROUTE_CHOICES = [
  { label: 'Directly', value: 'direct' },
  { label: 'Via someone', value: 'via' },
] as const;

/**
 * One charge type's route: Directly or Via someone, and the Sent via list while it goes via someone. Choosing
 * Via someone leaves Sent via empty until a person is picked. With nobody to pick, the buttons are locked.
 */
export function RouteField({ control, name, label, options, error }: RouteFieldProps) {
  const { field } = useController({ control, name });

  return (
    <View className="gap-2.5">
      <FormField label={label}>
        <ConnectedButtonGroup<RouteChoice>
          label={label}
          value={field.value === null ? 'direct' : 'via'}
          onChange={(choice) => field.onChange(choice === 'via' ? '' : null)}
          options={ROUTE_CHOICES}
          disabled={options.length === 0}
        />
      </FormField>
      {field.value !== null ? (
        <SelectField
          placeholder="Choose someone"
          options={options.map((option) => ({ label: option.name, value: option.personId }))}
          fieldControlProps={{ control, name, label: 'Sent via', required: true, error }}
        />
      ) : null}
    </View>
  );
}
