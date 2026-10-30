import { Plus, RefreshCw } from 'lucide-react-native';
import { useFieldArray, useWatch } from 'react-hook-form';
import { Text, View } from 'react-native';

import { Alert, Button, Card, DateField, DateRangeField, EmptyBox, MoneyInput, TextInput } from '@/components';
import type { BillBlocker } from '@splithouse/shared';
import type { ReviewFormProps } from '../types';
import { FileCard } from './file-card';
import { LineRow } from './line-row';
import { SubtotalRow } from './subtotal-row';

/**
 * The `review` board: the file with Choose another file, Current Charges, the bill's dates and
 * the utility lines, filled from what the server read and all editable. Save and Cancel are in
 * the footer. For a bill the server could not read it is the `unread` board: empty, with the
 * "Manual entry" Alert under the file.
 */
export function ReviewForm({ draft, control, onChooseAnother, blockers, linesNote, saveError }: ReviewFormProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = useWatch({ control, name: 'lines' });
  const hasLines = fields.length > 0;
  const blockerOn = (field: BillBlocker['field']) => blockers.find((blocker) => blocker.field === field);
  // The `unread` board: the server could not read the bill and the user said it is the right one.
  const typed = !draft.readOk;

  return (
    <>
      {saveError ? <Alert variant="danger" message={saveError} /> : null}
      <FileCard filename={draft.file.filename} meta={draft.file.meta} size="small">
        <Button
          label="Choose another file"
          icon={RefreshCw}
          variant="outline"
          size="small"
          onPress={onChooseAnother}
          className="mb-3"
        />
      </FileCard>
      {typed ? (
        <Alert
          title="Manual entry"
          message="This bill could not be read. Values will be keyed in manually."
        />
      ) : null}

      <Card className="gap-4">
        <MoneyInput
          placeholder="0.00"
          fieldControlProps={{
            control,
            name: 'currentChargesCents',
            label: 'Current Charges (SGD)',
            required: true,
          }}
        />
      </Card>

      <Card className="gap-4">
        <View className="flex-row gap-3">
          {/* Free text until a month picker exists. */}
          <TextInput
            placeholder="e.g Oct 2026"
            fieldControlProps={{
              control,
              name: 'billMonth',
              label: 'Bill month',
              required: true,
              error: blockerOn('billMonth')?.fieldMessage,
              className: 'min-w-0 flex-1',
            }}
          />
          <DateField
            clearable={false}
            fieldControlProps={{
              control,
              name: 'dueDate',
              label: 'Due date',
              required: true,
              className: 'min-w-0 flex-1',
            }}
          />
        </View>
        <DateRangeField
          fieldControlProps={{
            control,
            name: 'billingPeriod',
            label: 'Billing period',
            required: true,
            error: blockerOn('billingPeriod')?.fieldMessage,
          }}
        />
        {/* Both fields' problems sit together under them, as on the `period` board. */}
        {blockers.map((blocker) => (
          <Alert key={blocker.field} variant="danger" title={blocker.title} message={blocker.message} />
        ))}
      </Card>

      <Card className="gap-3 pb-1.5">
        <View className="gap-0.5">
          <Text className="font-manrope-bold text-label text-on-surface">Utility lines</Text>
          <Text className="font-manrope text-caption text-on-surface-variant">
            {hasLines
              ? 'Read from the bill. Edit, remove or add lines; they show on View bill.'
              : 'Optional. They show on View bill.'}
          </Text>
        </View>
        {hasLines ? (
          <>
            <View className="gap-4 pt-1.5">
              {fields.map((field, index) => (
                <LineRow
                  key={field.id}
                  control={control}
                  index={index}
                  label={lines[index]?.label ?? ''}
                  onRemove={() => remove(index)}
                />
              ))}
            </View>
            {draft.fields.subtotalCents !== null ? <SubtotalRow subtotalCents={draft.fields.subtotalCents} /> : null}
            {linesNote ? (
              <Alert variant="warning" title={linesNote.title} message={linesNote.message} />
            ) : null}
          </>
        ) : (
          <EmptyBox
            title="No lines found"
            note={
              typed ? 'Add them if you want them on View bill.' : 'Optional. Current Charges is all the split needs.'
            }
          />
        )}
        {/* The new row is inline, not a sheet; react-hook-form focuses its name field. */}
        <Button
          label="Add line"
          icon={Plus}
          variant="ghost"
          size="small"
          onPress={() => append({ label: '', cents: null })}
          className="self-start pl-1 pr-2"
        />
      </Card>
    </>
  );
}
