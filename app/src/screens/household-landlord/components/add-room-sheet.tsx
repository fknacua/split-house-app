import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Text, View } from 'react-native';

import {
  AppSheet,
  type AppSheetRef,
  Checkbox,
  ConnectedButtonGroup,
  CountInput,
  MoneyInput,
  TextInput,
} from '@/components';
import { EMPTY_NEW_ROOM, isNewRoomFilled, type NewRoomFormValues } from '../helpers';
import type { AddRoomSheetProps } from '../types';

/**
 * The Add room sheet: the type, then the name and units, plus rent and Include in total for a tenant room. It only
 * adds a card to the form, so nothing is stored until Save changes. The button waits until the fields are filled.
 */
export const AddRoomSheet = forwardRef<AppSheetRef, AddRoomSheetProps>(function AddRoomSheet({ types, onAdd }, ref) {
  const sheetRef = useRef<AppSheetRef>(null);
  const { control, reset, setValue } = useForm<NewRoomFormValues>({ defaultValues: EMPTY_NEW_ROOM });
  const values = useWatch({ control }) as NewRoomFormValues;
  const isTenantRoom = values.roomType === 'TENANT';

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        reset(EMPTY_NEW_ROOM);
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }),
    [reset],
  );

  return (
    <AppSheet
      ref={sheetRef}
      title="Add room"
      actionLabel="Add room"
      snapPoint="70%"
      disabled={!isNewRoomFilled(values)}
      onAction={() => {
        onAdd(values);
        sheetRef.current?.close();
      }}
    >
      <View className="gap-1.5">
        <Text className="font-manrope-bold text-label text-on-surface">Type</Text>
        <ConnectedButtonGroup
          label="Room type"
          value={values.roomType}
          onChange={(roomType) => setValue('roomType', roomType)}
          options={types.map((type) => ({ label: type.title, value: type.roomType }))}
        />
      </View>
      <TextInput
        placeholder={isTenantRoom ? 'e.g. Room 4' : 'e.g. Study'}
        fieldControlProps={{ control, name: 'name', label: 'Room name', required: true }}
      />
      <View className="flex-row items-start gap-3">
        {isTenantRoom ? (
          <MoneyInput
            placeholder="0.00"
            fieldControlProps={{ control, name: 'rentCents', label: 'Rent (SGD)', required: true, className: 'min-w-0 flex-1' }}
          />
        ) : null}
        <CountInput
          kind="whole"
          placeholder="0"
          fieldControlProps={{ control, name: 'airconUnits', label: 'Aircon units', required: true, className: 'min-w-0 flex-1' }}
        />
      </View>
      {isTenantRoom ? (
        <Checkbox control={control} name="includeInTotal" label="Include in total" className="-mt-2 self-end" />
      ) : null}
    </AppSheet>
  );
});
