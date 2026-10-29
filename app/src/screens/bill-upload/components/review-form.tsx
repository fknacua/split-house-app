import { Plus, RefreshCw } from 'lucide-react-native';
import { useFieldArray, useWatch } from 'react-hook-form';
import { Text, View } from 'react-native';

import { Alert, Button, Card, DateField, DateRangeField, MoneyInput, TextInput } from '@/components';
import type { ReviewFormProps } from '../types';
import { FileCard } from './file-card';
import { LineRow } from './line-row';

/**
 * The `review` board: the file with Choose another file, Current Charges, the bill's dates and
 * the utility lines, filled from what the server read and all editable. Save and Cancel are in
 * the footer.
 */
export function ReviewForm({ draft, control, onChooseAnother, saveError }: ReviewFormProps) {
  const { fields, remove } = useFieldArray({ control, name: 'lines' });
  const lines = useWatch({ control, name: 'lines' });
  const hasLines = fields.length > 0;

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
            placeholder="Oct 2026"
            fieldControlProps={{ control, name: 'billMonth', label: 'Bill month', className: 'min-w-0 flex-1' }}
          />
          <DateField
            clearable={false}
            fieldControlProps={{ control, name: 'dueDate', label: 'Due date', className: 'min-w-0 flex-1' }}
          />
        </View>
        <DateRangeField
          placeholder="1–31 Oct 2026"
          fieldControlProps={{ control, name: 'billingPeriod', label: 'Billing period' }}
        />
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
        ) : null}
        {/* Add line appends an inline row in 6.3; until then it does nothing. */}
        <Button label="Add line" icon={Plus} variant="ghost" size="small" className="self-start pl-1 pr-2" />
      </Card>
    </>
  );
}
