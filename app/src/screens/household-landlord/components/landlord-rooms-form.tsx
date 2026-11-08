import { Plus, Undo } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import {
  Alert,
  type AppSheetRef,
  Button,
  ConfirmDialog,
  Screen,
  SubpageFooter,
  SubpageHeader,
} from '@/components';
import { useKeepFocusedInputVisible } from '@/hooks';
import { EditSaveActions, EditSummaryCard, useEditFlow } from '@/screens/household-person';
import { hasHomeChanges, toHomeEdit, toHomeFormValues, type HomeFormValues } from '../helpers';
import type { LandlordRoomsFormProps } from '../types';
import { AddRoomSheet } from './add-room-sheet';
import { DatedHeading } from './dated-heading';
import { LandlordFields } from './landlord-fields';
import { RemovedRoomCard } from './removed-room-card';
import { RoomCard } from './room-card';

const ROOM_ORDER = ['MASTER', 'TENANT', 'COMMON'] as const;

/**
 * The `LandlordRooms` board: a Landlord card, one card per room by type and Add room, all saved together from next
 * month. The server checks every field and writes the summary and the master room's rent. A removed room only goes
 * when Save is pressed. Leaving with unsaved changes asks first.
 */
export function LandlordRoomsForm({ form }: LandlordRoomsFormProps) {
  // The refetch after a save changes the response while the screen is closing, so the form keeps what it opened on.
  const [opened] = useState(form);
  const { control, setValue } = useForm<HomeFormValues>({ defaultValues: toHomeFormValues(opened) });
  const { fields: newRooms, append, remove } = useFieldArray({ control, name: 'newRooms' });
  const values = useWatch({ control }) as HomeFormValues;
  const dirty = hasHomeChanges(values, opened);
  const flow = useEditFlow(toHomeEdit(values), dirty);
  const { errors, warnings, guard } = flow;
  const sheetRef = useRef<AppSheetRef>(null);
  const keepFocusedInputVisible = useKeepFocusedInputVisible();
  const hasFieldErrors = Object.keys(errors).some((key) => key !== 'form');

  const savedCards = (type: (typeof ROOM_ORDER)[number]) =>
    opened.rooms.map((room, index) => {
      if (room.roomType !== type) return null;
      if (values.rooms[index]?.removed) {
        return <RemovedRoomCard key={room.id} name={room.name} onUndo={() => setValue(`rooms.${index}.removed`, false)} />;
      }
      const calculated = flow.masterRent === undefined ? room.calculatedRent : (flow.masterRent ?? '—');
      return (
        <RoomCard
          key={room.id}
          control={control}
          path={`rooms.${index}`}
          errorKey={`rooms.${room.id}`}
          roomType={room.roomType}
          title={room.title}
          badge={room.badge}
          calculatedRent={room.roomType === 'MASTER' ? calculated : null}
          occupants={room.occupants}
          errors={errors}
          warnings={warnings}
          onRemove={room.canRemove ? () => setValue(`rooms.${index}.removed`, true) : null}
        />
      );
    });

  // The server's rooms to add come first in `newRooms`, so their cards keep the server's title, rent and occupants.
  const newCards = (type: (typeof ROOM_ORDER)[number]) =>
    newRooms.map((room, index) => {
      if (room.roomType !== type) return null;
      const seeded = opened.roomsToAdd[index];
      if (seeded) {
        const calculated = flow.masterRent === undefined ? seeded.calculatedRent : (flow.masterRent ?? '—');
        return (
          <RoomCard
            key={room.id}
            control={control}
            path={`newRooms.${index}`}
            errorKey={`newRooms.${index}`}
            roomType={type}
            title={seeded.title}
            badge={seeded.badge}
            calculatedRent={type === 'MASTER' ? calculated : null}
            occupants={seeded.occupants}
            errors={errors}
            warnings={warnings}
            onRemove={seeded.canRemove ? () => remove(index) : null}
          />
        );
      }
      const content = opened.newRoomTypes.find((t) => t.roomType === type);
      return (
        <RoomCard
          key={room.id}
          control={control}
          path={`newRooms.${index}`}
          errorKey={`newRooms.${index}`}
          roomType={type}
          title={content?.title ?? ''}
          badge={content?.badge ?? null}
          calculatedRent={null}
          occupants={null}
          errors={errors}
          warnings={warnings}
          onRemove={() => remove(index)}
        />
      );
    });

  return (
    <Screen>
      <SubpageHeader title={opened.title} subtitle={opened.sub} onBack={guard.requestLeave} />
      {/* Edge-to-edge Android does not resize for the keyboard, so the padding keeps the focused field in view. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          {...keepFocusedInputVisible}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-3 px-4 pb-4 pt-2"
        >
          <View pointerEvents={flow.saving ? 'none' : 'auto'} className="gap-3">
            <DatedHeading title={opened.datedTitle} note={opened.pendingNote} />
            <LandlordFields control={control} errors={errors} />
            {ROOM_ORDER.map((type) => (
              <View key={type} className="gap-3">
                {savedCards(type)}
                {newCards(type)}
              </View>
            ))}
            <Button label="Add room" variant="outline" icon={Plus} onPress={() => sheetRef.current?.open()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <SubpageFooter>
        <EditSummaryCard groups={flow.groups} loading={dirty && !flow.answered && !flow.previewFailed} />
        {hasFieldErrors ? <Alert variant="danger" message="Some errors in the form" className="mb-1.5" /> : null}
        <EditSaveActions flow={flow} disabled={!dirty} />
        <Button label="Cancel" variant="ghost" disabled={flow.saving} onPress={guard.requestLeave} />
      </SubpageFooter>
      <AddRoomSheet ref={sheetRef} types={opened.newRoomTypes} onAdd={append} />
      <ConfirmDialog
        open={guard.asking}
        icon={Undo}
        title="Discard changes?"
        body="Your edits to the rent and rooms haven’t been saved. If you leave now, they’ll be lost."
        cancelLabel="Keep editing"
        onCancel={guard.keepEditing}
        confirmLabel="Discard"
        onConfirm={guard.discard}
      />
    </Screen>
  );
}
