import { zodResolver } from '@hookform/resolvers/zod';
import { Undo } from 'lucide-react-native';
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
  hasUnpickedRoute,
  hasUnsavedChanges,
  personFormSchema,
  toHouseholdEdit,
  toPersonFormValues,
  type PersonFormValues,
} from '../helpers';
import type { PersonFormProps } from '../types';
import { useEditFlow } from '../use-edit-flow';
import { ColorField } from './color-field';
import { EditSaveActions } from './edit-save-actions';
import { EditSummaryCard } from './edit-summary-card';
import { FormSection } from './form-section';
import { RouteField } from './route-field';

/**
 * The `editPerson` board: "Saved right away" (Name, WhatsApp, Color) and the dated group, which takes effect
 * next month (the amounts and routes only for a tenant). It opens on the latest saved values. The summary lists only what
 * changed in this edit, and with Save is in the footer. Save returns to the overview, on the month it was
 * showing, with a toast. Leaving with unsaved changes asks first. "Remove from household" does nothing until
 * 9.8.
 */
export function PersonForm({ form }: PersonFormProps) {
  const {
    control,
    formState: { isValid },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    mode: 'onChange',
    defaultValues: toPersonFormValues(form),
  });

  const values = useWatch({ control }) as PersonFormValues;
  const dirty = hasUnsavedChanges(values, form);
  const flow = useEditFlow(toHouseholdEdit(values, form), dirty);
  const { errors, guard } = flow;

  return (
    <Screen>
      <SubpageHeader title={form.title} subtitle={form.sub} onBack={guard.requestLeave} />
      {/* Edge-to-edge Android does not resize for the keyboard, so the padding keeps the focused field in view. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 px-4 pb-4 pt-2">
          <View pointerEvents={flow.saving ? 'none' : 'auto'} className="gap-4">
            <FormSection title="Saved right away" separated={false}>
              <TextInput
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

            <FormSection title={form.datedTitle} note={form.pendingNote} separated>
              {form.values.amounts ? (
                <>
                  <View className="flex-row items-start gap-3">
                    <MoneyInput
                      placeholder="0.00"
                      fieldControlProps={{
                        control,
                        name: 'rentCents',
                        label: 'Rent (SGD)',
                        required: true,
                        error: errors.rentCents,
                        className: 'min-w-0 flex-1',
                      }}
                    />
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
                  </View>
                  <View className="flex-row items-start gap-3">
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
                    <MoneyInput
                      placeholder="None"
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
              ) : (
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
              )}
            </FormSection>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <SubpageFooter>
        <EditSummaryCard groups={flow.groups} loading={dirty && !flow.answered && !flow.previewFailed} />
        <EditSaveActions flow={flow} disabled={!isValid || hasUnpickedRoute(values)} />
        {form.secondaryAction.kind === 'remove-person' ? (
          <Button label={form.secondaryAction.label} variant="ghost-danger" disabled={flow.saving} />
        ) : (
          <Button
            label={form.secondaryAction.label}
            variant="ghost"
            disabled={flow.saving}
            onPress={guard.requestLeave}
          />
        )}
      </SubpageFooter>
      <ConfirmDialog
        open={guard.asking}
        icon={Undo}
        title="Discard changes?"
        body={`Your edits to ${form.viewTitle} haven’t been saved. If you leave now, they’ll be lost.`}
        cancelLabel="Keep editing"
        onCancel={guard.keepEditing}
        confirmLabel="Discard"
        onConfirm={guard.discard}
      />
    </Screen>
  );
}
