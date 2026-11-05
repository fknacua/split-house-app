import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import {
  Alert,
  AppSheet,
  type AppSheetRef,
  MoneyInput,
  MonthPicker,
  SelectField,
  TextInput,
  useSuccessToast,
} from '@/components';
import { useDebouncedValue, useHouseholdEditPreview, useSaveHouseholdEdit } from '@/hooks';
import { EditSummaryCard, PREVIEW_DELAY_MS, requestMessage } from '@/screens/household-person';
import { toRecurringEdit, toRecurringValues, type RecurringFormValues } from '../helpers';
import type { RecurringSheetProps } from '../types';

/**
 * The add and edit sheet for a recurring charge, not drawn: label, amount, who and an optional end month, then the
 * summary card and Save changes. Mounted fresh for each opening, so it never shows an earlier opening's answer. The
 * server checks every field as it changes. Remove charge hands over to the dialog, which sits on the overview.
 */
export const RecurringSheet = forwardRef<AppSheetRef, RecurringSheetProps>(function RecurringSheet(
  { sheet, charge, onRemove, onClose },
  ref,
) {
  const sheetRef = useRef<AppSheetRef>(null);
  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.open(),
    close: () => sheetRef.current?.close(),
  }));

  const showToast = useSuccessToast();
  const save = useSaveHouseholdEdit();
  const { control } = useForm<RecurringFormValues>({ defaultValues: toRecurringValues(charge) });
  const values = useWatch({ control }) as RecurringFormValues;

  const edit = toRecurringEdit(values, charge?.chargeId ?? null);
  const editKey = JSON.stringify(edit);
  const previewedEdit = useDebouncedValue(edit, PREVIEW_DELAY_MS);
  const preview = useHouseholdEditPreview(previewedEdit);
  const answered = !preview.isPlaceholderData && preview.isSuccess && editKey === JSON.stringify(previewedEdit);
  const errors = preview.data?.errors ?? {};
  const isDirty = editKey !== JSON.stringify(toRecurringEdit(toRecurringValues(charge), charge?.chargeId ?? null));
  // A failed save stops counting once the values change, so the button reads Save changes again.
  const failed = save.isError && JSON.stringify(save.variables) === editKey;
  const notice = errors.form ?? requestMessage(preview.error);

  return (
    <AppSheet
      ref={sheetRef}
      title={charge ? sheet.editTitle : sheet.addTitle}
      subtitle={sheet.datedTitle}
      actionLabel={save.isPending ? 'Saving' : 'Save changes'}
      // The save's refetch changes the loaded values, so the checks only count before it starts.
      disabled={!save.isPending && !(answered && preview.data?.canSave === true)}
      saving={save.isPending}
      failed={failed}
      failedMessage={requestMessage(save.error) ?? undefined}
      dangerAction={
        charge
          ? {
              label: 'Remove charge',
              onPress: () => {
                sheetRef.current?.close();
                onRemove(charge);
              },
            }
          : undefined
      }
      onAction={() =>
        save.mutate(edit, {
          onSuccess: () => {
            showToast('Changes saved');
            sheetRef.current?.close();
          },
        })
      }
      onClose={onClose}
    >
      <TextInput
        placeholder="e.g. Internet"
        fieldControlProps={{ control, name: 'label', label: 'Label', required: true, error: errors.label }}
      />
      <MoneyInput
        placeholder="0.00"
        fieldControlProps={{ control, name: 'amountCents', label: 'Amount (SGD)', required: true, error: errors.amountCents }}
      />
      <SelectField
        placeholder="Choose someone"
        options={sheet.people.map((person) => ({ label: person.name, value: person.personId }))}
        fieldControlProps={{ control, name: 'personId', label: 'Who', required: true, error: errors.personId }}
      />
      <MonthPicker
        sheetTitle="End month"
        months={sheet.endMonths}
        placeholder="No end month"
        clearable
        fieldControlProps={{ control, name: 'endMonth', label: 'End month (optional)', error: errors.endMonth }}
      />
      {notice ? <Alert variant="danger" message={notice} /> : null}
      <EditSummaryCard groups={preview.data?.groups ?? []} loading={charge !== null && isDirty && !answered && !preview.isError} />
    </AppSheet>
  );
});
