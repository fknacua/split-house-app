import { Trash2 } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Badge, Button, Card, Checkbox, CountInput, MoneyInput, TextInput } from '@/components';
import type { RoomCardProps } from '../types';
import { ReadOnlyField } from './read-only-field';

/**
 * One room's card, by type. Master: name, calculated rent, units and who shares it. Tenant: name, rent, units,
 * the tenant when occupied and Include in total. Common: name and units. Remove room shows when `onRemove` is given.
 */
export function RoomCard({
  control,
  path,
  errorKey,
  roomType,
  title,
  badge,
  calculatedRent,
  occupants,
  errors,
  warnings,
  onRemove,
}: RoomCardProps) {
  const rentKey = `${errorKey}.rentCents`;
  const units = (
    <CountInput
      kind="whole"
      placeholder="0"
      fieldControlProps={{
        control,
        name: `${path}.airconUnits`,
        label: 'Aircon units',
        required: true,
        error: errors[`${errorKey}.airconUnits`],
        className: 'min-w-0 flex-1',
      }}
    />
  );

  return (
    <Card padded={false} className="gap-3.5 px-4 py-3.5">
      <View className="flex-row items-center justify-between gap-2">
        <Text accessibilityRole="header" className="min-w-0 flex-1 font-manrope-bold text-label text-on-surface">
          {title}
        </Text>
        {badge ? <Badge label={badge.label} variant={badge.tone} /> : null}
      </View>
      <TextInput
        fieldControlProps={{
          control,
          name: `${path}.name`,
          label: 'Room name',
          required: true,
          error: errors[`${errorKey}.name`],
        }}
      />
      {roomType === 'MASTER' ? (
        <View className="flex-row items-start gap-3">
          <ReadOnlyField
            label="Rent (calculated)"
            value={calculatedRent ?? '—'}
            error={errors[rentKey]}
            className="min-w-0 flex-1"
          />
          {units}
        </View>
      ) : roomType === 'TENANT' ? (
        <View className="flex-row items-start gap-3">
          <MoneyInput
            placeholder="0.00"
            fieldControlProps={{
              control,
              name: `${path}.rentCents`,
              label: 'Rent (SGD)',
              required: true,
              error: errors[rentKey],
              warning: warnings[rentKey],
              className: 'min-w-0 flex-1',
            }}
          />
          {units}
        </View>
      ) : (
        <View className="flex-row items-start gap-3">
          {units}
          <View className="flex-1" />
        </View>
      )}
      {occupants ? <ReadOnlyField label={roomType === 'MASTER' ? 'Shared by' : 'Tenant'} value={occupants} /> : null}
      {roomType === 'TENANT' ? (
        <Checkbox control={control} name={`${path}.includeInTotal`} label="Include in total" className="-my-1.5 self-end" />
      ) : null}
      {onRemove ? (
        <View className="flex-row justify-end border-t border-outline-variant pt-2">
          <Button label="Remove room" variant="outline-danger" size="small" icon={Trash2} onPress={onRemove} />
        </View>
      ) : null}
    </Card>
  );
}
