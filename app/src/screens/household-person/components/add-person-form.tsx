import { zodResolver } from '@hookform/resolvers/zod';
import { Undo } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import {
  Button,
  ConfirmDialog,
  CountInput,
  MoneyInput,
  PhoneInput,
  Screen,
  SubpageFooter,
  SubpageHeader,
  TextInput,
} from '@/components';
import {
  addPersonFormSchemaFor,
  hasAddPersonInput,
  hasUnpickedRoute,
  isPrimaryRoom,
  toAddPersonEdit,
  toAddPersonFormValues,
  type PersonFormValues,
} from '../helpers';
import type { AddPersonFormProps } from '../types';
import { useEditFlow } from '../use-edit-flow';
import { ColorField } from './color-field';
import { EditSaveActions } from './edit-save-actions';
import { FormSection } from './form-section';
import { RoomField } from './room-field';
import { RouteField } from './route-field';

/**
 * The `addPerson` board: the person form, empty, on the default color, with an empty room to pick. It has no summary
 * card, since the form is the summary, and Save stays disabled until the required fields are filled. The tenant joins
 * from next month. Save returns to the overview with a toast. Leaving with something typed asks first.
 *
 * In First run (`addPersonFR` to `addPersonFilled2FR`) it is Add person, with no dated title. Picking the master room
 * makes them the primary tenant: the form keeps name, WhatsApp, color and the two due days, and drops the shares,
 * deposit and routes, which the split and the role decide. Those are rows 2 to 4, under the due days, so picking a room
 * only hides or shows rows and never moves a field.
 *
 * The form keeps the response it opened with. Saving refetches it, and the refetched rooms no longer hold the one
 * just taken, which would otherwise change the layout while the save finishes.
 */
export function AddPersonForm({ form: opened }: AddPersonFormProps) {
  const [form] = useState(opened);
  const resolver = useMemo(() => zodResolver(addPersonFormSchemaFor(form.rooms)), [form.rooms]);
  const {
    control,
    formState: { isValid },
  } = useForm<PersonFormValues>({
    resolver,
    mode: 'onChange',
    defaultValues: toAddPersonFormValues(form),
  });

  const values = useWatch({ control }) as PersonFormValues;
  const primary = isPrimaryRoom(form.rooms, values.roomId);
  const flow = useEditFlow(toAddPersonEdit(values, primary), hasAddPersonInput(values, form));
  const { errors, guard } = flow;

  return (
    <Screen>
      <SubpageHeader title={form.title} subtitle={form.sub} onBack={guard.requestLeave} />
      {/* Edge-to-edge Android does not resize for the keyboard, so the padding keeps the focused field in view. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 px-4 pb-4 pt-2">
          <View pointerEvents={flow.saving ? 'none' : 'auto'} className="gap-4">
            <FormSection title="Details" separated={false}>
              <TextInput
                placeholder="e.g. first name"
                fieldControlProps={{
                  control,
                  name: 'name',
                  label: 'Name (used in messages)',
                  required: true,
                  error: errors.name,
                }}
              />
              <PhoneInput
                fieldControlProps={{
                  control,
                  name: 'whatsapp',
                  label: 'WhatsApp (optional)',
                  error: errors.whatsappE164,
                }}
              />
              <ColorField control={control} swatches={form.swatches} fallbackName={form.colorName} />
            </FormSection>

            <FormSection title="Room" separated>
              <RoomField control={control} rooms={form.rooms} error={errors.roomId} />
            </FormSection>

            <FormSection title={form.datedTitle} separated>
              <View className="flex-row items-start gap-3">
                <CountInput
                  kind="day"
                  placeholder="Day, e.g. 1st"
                  fieldControlProps={{
                    control,
                    name: 'rentDueDay',
                    label: 'Rent due',
                    required: true,
                    error: errors.rentDueDay,
                    className: 'min-w-0 flex-1',
                  }}
                />
                <CountInput
                  kind="day"
                  placeholder="Day, e.g. 4th"
                  fieldControlProps={{
                    control,
                    name: 'utilitiesDueDay',
                    label: 'Utilities due',
                    required: true,
                    error: errors.utilitiesDueDay,
                    className: 'min-w-0 flex-1',
                  }}
                />
              </View>
              {primary ? null : (
                <>
                  <View className="flex-row items-start gap-3">
                    <CountInput
                      kind="shares"
                      placeholder="e.g. 1"
                      fieldControlProps={{
                        control,
                        name: 'utilityShares',
                        label: 'Utility shares',
                        required: true,
                        error: errors.utilityShares,
                        className: 'min-w-0 flex-1',
                      }}
                    />
                    <MoneyInput
                      placeholder="Optional"
                      fieldControlProps={{
                        control,
                        name: 'depositCents',
                        label: 'Deposit held (SGD)',
                        error: errors.depositCents,
                        className: 'min-w-0 flex-1',
                      }}
                    />
                  </View>
                  <RouteField
                    control={control}
                    name="rentVia"
                    label="Rent paid"
                    options={form.sentViaOptions}
                    error={errors.rentViaPersonId}
                  />
                  <RouteField
                    control={control}
                    name="utilitiesVia"
                    label="Utilities paid"
                    options={form.sentViaOptions}
                    error={errors.utilitiesViaPersonId}
                  />
                </>
              )}
            </FormSection>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <SubpageFooter>
        <EditSaveActions
          flow={flow}
          label={form.saveLabel}
          disabled={!isValid || hasUnpickedRoute(values, primary)}
        />
        <Button label="Cancel" variant="ghost" disabled={flow.saving} onPress={guard.requestLeave} />
      </SubpageFooter>
      <ConfirmDialog
        open={guard.asking}
        icon={Undo}
        title="Discard changes?"
        body="This person hasn’t been saved. If you leave now, what you entered will be lost."
        cancelLabel="Keep editing"
        onCancel={guard.keepEditing}
        confirmLabel="Discard"
        onConfirm={guard.discard}
      />
    </Screen>
  );
}
