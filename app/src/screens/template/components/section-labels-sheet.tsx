import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Text, View } from 'react-native';

import { AppSheet, type AppSheetRef, TextInput, useSuccessToast } from '@/components';
import { MessageSection } from '@/components/message-preview/message-section';
import { useSaveTemplateLabels } from '@/hooks';
import { sectionLabelOf, toSectionLabels } from '../helpers';
import type { SectionLabels, SectionLabelsSheetProps } from '../types';

/** The sheet's values: a label per section, by person. */
interface SectionLabelsFormValues {
  labels: SectionLabels;
}

/**
 * The Section labels sheet, built like Line labels: the hint, a field per section showing the usual label when blank,
 * a small preview of the sections that follows the fields, then Cancel | Save. Save stays disabled until a label
 * changes, and applies immediately; the editor's preview re-renders before the sheet closes. Cancel, the scrim and the
 * back gesture drop edits.
 */
export const SectionLabelsSheet = forwardRef<AppSheetRef, SectionLabelsSheetProps>(function SectionLabelsSheet(
  { recipientId, block },
  ref
) {
  const sheetRef = useRef<AppSheetRef>(null);
  const save = useSaveTemplateLabels();
  const showToast = useSuccessToast();
  // The block the sheet opened on: a save refetches `block` while the sheet is closing.
  const [opened, setOpened] = useState(block);
  const { control, reset } = useForm<SectionLabelsFormValues>({ defaultValues: { labels: toSectionLabels(block) } });
  const saved = toSectionLabels(opened);
  const draft = (useWatch({ control, name: 'labels' }) ?? saved) as SectionLabels;
  const changed = opened.rows.some((row) => (draft[row.personId] ?? '') !== (saved[row.personId] ?? ''));

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        setOpened(block);
        reset({ labels: toSectionLabels(block) });
        save.reset();
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }),
    [block, reset, save]
  );

  const onSave = () =>
    save.mutate(
      { lineLabels: {}, sectionTitles: { [recipientId]: draft } },
      {
        onSuccess: () => {
          sheetRef.current?.close();
          showToast('Changes saved');
        },
      }
    );

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
      disabled={!changed}
    >
      {opened.rows.map((row) => (
        <TextInput
          key={row.personId}
          placeholder={row.placeholder}
          fieldControlProps={{ control, name: `labels.${row.personId}`, label: row.label, disabled: save.isPending }}
        />
      ))}
      <View className="gap-2">
        <Text className="px-1 font-manrope-bold text-label text-on-surface">Preview</Text>
        <View className="gap-1.5 rounded-xl bg-container px-3.5 py-3">
          {opened.rows.map((row) => (
            <MessageSection
              key={row.personId}
              section={{ title: `${sectionLabelOf(draft, row)}:`, lines: row.lines, subtotal: row.subtotal }}
            />
          ))}
        </View>
      </View>
    </AppSheet>
  );
});
