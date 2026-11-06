import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'lucide-react-native';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Text, View } from 'react-native';

import { AppSheet, type AppSheetRef, Icon, TextInput, useSuccessToast } from '@/components';
import { useSaveTemplateLabels } from '@/hooks';
import { templateLabelsSaveRequestSchema, type TemplateLabelsSaveRequest } from '@splithouse/shared';
import { hasLabelsChanges, toLabelsFormValues, type LabelsFormValues } from '../helpers';
import type { LineLabelsSheetProps } from '../types';

/**
 * The Line labels sheet: one field per charge label. The labels apply immediately; the preview behind re-renders
 * before the sheet closes. A blank label shows `Enter a label.`. Save stays disabled until something changes. Cancel,
 * the scrim and the back gesture drop edits, as drawn.
 */
export const LineLabelsSheet = forwardRef<AppSheetRef, LineLabelsSheetProps>(function LineLabelsSheet(
  { labels },
  ref
) {
  const sheetRef = useRef<AppSheetRef>(null);
  const save = useSaveTemplateLabels();
  const showToast = useSuccessToast();
  // The labels the sheet opened on: a save refetches `labels` while the sheet is closing.
  const [opened, setOpened] = useState(labels);
  const {
    control,
    reset,
    formState: { isValid },
  } = useForm<LabelsFormValues, unknown, TemplateLabelsSaveRequest>({
    defaultValues: toLabelsFormValues(labels),
    resolver: zodResolver(templateLabelsSaveRequestSchema),
    mode: 'onChange',
  });
  const values = useWatch({ control }) as LabelsFormValues;

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        setOpened(labels);
        reset(toLabelsFormValues(labels));
        save.reset();
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }),
    [labels, reset, save]
  );

  const onSave = () =>
    save.mutate(templateLabelsSaveRequestSchema.parse(values), {
      onSuccess: () => {
        sheetRef.current?.close();
        showToast('Changes saved');
      },
    });

  return (
    <AppSheet
      ref={sheetRef}
      title={opened.title}
      subtitle={opened.hint}
      actionLabel="Save"
      actionsInRow
      fitContent
      onAction={onSave}
      saving={save.isPending}
      failed={save.isError}
      disabled={!isValid || !hasLabelsChanges(values, opened)}
    >
      <View className="-mt-3 flex-row items-center gap-1">
        <Icon as={Link} size={12} className="text-on-surface-variant" />
        <Text className="font-manrope-semibold text-caption text-on-surface-variant">{opened.sharedNote}</Text>
      </View>
      {opened.rows.map((row) => (
        <TextInput
          key={row.type}
          fieldControlProps={{ control, name: `lineLabels.${row.type}`, label: row.label, disabled: save.isPending }}
        />
      ))}
    </AppSheet>
  );
});
