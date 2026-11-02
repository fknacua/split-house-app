import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Undo } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import {
  Alert,
  Button,
  ConfirmDialog,
  CountInput,
  DEFAULT_FAILED_MESSAGE,
  FormField,
  MoneyInput,
  MonthSelectField,
  PhoneInput,
  Screen,
  SubpageFooter,
  SubpageHeader,
  TextInput,
  useSuccessToast,
} from '@/components';
import { useDebouncedValue, useHouseholdEditPreview, useSaveHouseholdEdit, useUnsavedGuard } from '@/hooks';
import { ApiRequestError } from '@/lib/api';
import {
  hasUnsavedChanges,
  mergeTypedValues,
  personFormSchema,
  toHouseholdEdit,
  toPersonFormValues,
  type PersonFormValues,
} from '../helpers';
import type { PersonFormProps } from '../types';
import { ColorField } from './color-field';
import { EditSummaryCard } from './edit-summary-card';
import { FormSection } from './form-section';

/** How long the form has to stay still before the server previews it, in milliseconds. */
const PREVIEW_DELAY_MS = 500;

/** The message for a failed preview, or null for an unreachable server, which the app's own prompt covers. */
const requestMessage = (error: Error | null) => (error instanceof ApiRequestError ? error.message : null);

/**
 * The `editPerson` board: "Saved right away" (Name, WhatsApp, Color) and "From a month you pick" (Starts
 * from and everything dated; the amounts only for a tenant). The summary, the later-version warning and
 * Save are in the footer, and all come from the preview. Save returns to the overview, on the month it was
 * showing, with a toast. Leaving with unsaved changes asks first. "Remove from household" does nothing until
 * 9.8.
 */
export function PersonForm({ form, month, onMonthChange, monthLoaded, monthError }: PersonFormProps) {
  const router = useRouter();
  const save = useSaveHouseholdEdit();
  const showToast = useSuccessToast();
  const {
    control,
    getValues,
    reset,
    trigger,
    formState: { isValid },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    mode: 'onChange',
    defaultValues: toPersonFormValues(form),
  });

  // Another month's response reloads the fields the user has not changed.
  const shownForm = useRef(form);
  useEffect(() => {
    if (shownForm.current === form) return;
    const oldValues = toPersonFormValues(shownForm.current);
    shownForm.current = form;
    reset(mergeTypedValues(getValues(), oldValues, toPersonFormValues(form)));
    // The reset clears errors, and a field the user emptied still has one.
    void trigger();
  }, [form, getValues, reset, trigger]);

  const values = useWatch({ control }) as PersonFormValues;
  const edit = toHouseholdEdit(values, form);
  const previewedEdit = useDebouncedValue(edit, PREVIEW_DELAY_MS);
  const preview = useHouseholdEditPreview(previewedEdit, monthLoaded);
  const answered =
    monthLoaded &&
    !preview.isPlaceholderData &&
    preview.isSuccess &&
    JSON.stringify(edit) === JSON.stringify(previewedEdit);
  const answer = preview.data;
  const errors = answer?.errors ?? {};
  const dirty = hasUnsavedChanges(values, form);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/household');
  };
  const guard = useUnsavedGuard({ dirty, busy: save.isPending, leave });

  const onSave = () =>
    save.mutate(edit, {
      onSuccess: () => {
        showToast('Changes saved');
        router.dismissTo('/household');
      },
    });

  // A failed save stops counting once the values change, so the button reads Save changes again.
  const failed = save.isError && JSON.stringify(save.variables) === JSON.stringify(edit);
  const noticeError = errors.form ?? requestMessage(preview.error) ?? monthError;

  return (
    <Screen>
      <SubpageHeader title={form.title} subtitle={form.sub} onBack={guard.requestLeave} />
      {/* Edge-to-edge Android does not resize for the keyboard, so the padding keeps the focused field in view. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 px-4 pb-4 pt-2">
          <View pointerEvents={save.isPending ? 'none' : 'auto'} className="gap-4">
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
                fieldControlProps={{ control, name: 'whatsapp', label: 'WhatsApp', error: errors.whatsappE164 }}
              />
              <ColorField control={control} swatches={form.swatches} fallbackName={form.colorName} />
            </FormSection>

            <FormSection title="From a month you pick" separated>
              <FormField label="Starts from" error={errors.startsFromMonth}>
                <MonthSelectField
                  months={form.startsFromOptions}
                  value={month}
                  onChange={onMonthChange}
                  accessibilityLabel="Starts from"
                  invalid={!!errors.startsFromMonth}
                />
              </FormField>
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
                  <View className="flex-row items-start gap-3">
                    <CountInput
                      kind="whole"
                      placeholder="e.g. 1"
                      fieldControlProps={{
                        control,
                        name: 'airconUnits',
                        label: 'Aircon units',
                        required: true,
                        error: errors.airconUnits,
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
        <EditSummaryCard groups={answer?.groups ?? []} loading={dirty && !answered && !preview.isError} />
        {answer?.laterVersionWarning ? (
          <Alert variant="warning" message={answer.laterVersionWarning} className="mb-1.5" />
        ) : null}
        {noticeError ? <Alert variant="danger" message={noticeError} className="mb-1.5" /> : null}
        {failed ? (
          <Alert
            variant="danger"
            message={requestMessage(save.error) ?? DEFAULT_FAILED_MESSAGE}
            className="mb-1.5"
          />
        ) : null}
        <Button
          label={save.isPending ? 'Saving' : failed ? 'Retry' : 'Save changes'}
          loading={save.isPending}
          // The save's refetch changes the loaded values, so the checks only count before it starts.
          disabled={!save.isPending && (!isValid || !answered || !answer?.canSave)}
          onPress={onSave}
        />
        {form.secondaryAction.kind === 'remove-person' ? (
          <Button label={form.secondaryAction.label} variant="ghost-danger" disabled={save.isPending} />
        ) : (
          <Button
            label={form.secondaryAction.label}
            variant="ghost"
            disabled={save.isPending}
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
