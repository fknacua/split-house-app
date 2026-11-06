import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { type AppSheetRef, Button, Screen, SubpageFooter, SubpageHeader, useSuccessToast } from '@/components';
import { useKeepFocusedInputVisible } from '@/hooks';
import { EditSaveActions } from '@/screens/household-person';
import {
  hasTemplateChanges,
  insertAtCursor,
  templateFormSchema,
  toTemplateDraft,
  toTemplateFormValues,
  type TemplateFormValues,
  type TextSelection,
} from '../helpers';
import type { TemplateFormProps } from '../types';
import { useTemplateFlow } from '../use-template-flow';
import { LineLabelsSheet } from './line-labels-sheet';
import { MessageField } from './message-field';
import { PlaceholderChips } from './placeholder-chips';
import { PreviewCard } from './preview-card';
import { RemoveTemplateDialog } from './remove-template-dialog';
import { RestoreTemplateDialog } from './restore-template-dialog';
import { SectionLabelsCard } from './section-labels-card';
import { SectionLabelsSheet } from './section-labels-sheet';

/**
 * The template editor: the message, checked with the shared message rules as the user types, with chips that insert
 * at the cursor and a preview the server renders. Save stays disabled until the text changes, and applies
 * immediately. Back and Cancel drop unsaved edits, as drawn.
 */
export function TemplateForm({ form, onRestored }: TemplateFormProps) {
  // The refetch after a save changes the response while the screen is closing, so the form keeps what it opened on.
  const [opened] = useState(form);
  const {
    control,
    setValue,
    setFocus,
    formState: { isValid },
  } = useForm<TemplateFormValues>({
    defaultValues: toTemplateFormValues(opened),
    resolver: zodResolver(templateFormSchema),
    mode: 'onChange',
  });
  const values = useWatch({ control }) as TemplateFormValues;
  const dirty = hasTemplateChanges(values, opened);
  const flow = useTemplateFlow(toTemplateDraft(values, opened), isValid);
  const router = useRouter();
  const showToast = useSuccessToast();
  const [removing, setRemoving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const labelsSheet = useRef<AppSheetRef>(null);
  const keepFocusedInputVisible = useKeepFocusedInputVisible();
  const sectionLabelsSheet = useRef<AppSheetRef>(null);

  const cursor = useRef<TextSelection>({ start: opened.text.length, end: opened.text.length });
  // Set for the render after an insert, then handed back so the user can move the cursor.
  const [placedCursor, setPlacedCursor] = useState<TextSelection | undefined>(undefined);

  const insert = (placeholder: string) => {
    const next = insertAtCursor(values.text, cursor.current, placeholder);
    setValue('text', next.text, { shouldValidate: true });
    cursor.current = { start: next.cursor, end: next.cursor };
    setPlacedCursor(cursor.current);
    setFocus('text');
  };

  return (
    <Screen>
      <SubpageHeader title={opened.title} subtitle={opened.sub} onBack={flow.leave} />
      {/* Edge-to-edge Android does not resize for the keyboard, so the padding keeps the focused field in view. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          {...keepFocusedInputVisible}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-4 pb-4 pt-2"
        >
          <View pointerEvents={flow.saving ? 'none' : 'auto'} className="gap-4">
            <View className="gap-2">
              <MessageField
                control={control}
                restoreLabel={opened.restore?.label}
                onRestore={opened.restore ? () => setRestoring(true) : undefined}
                disabled={flow.saving}
                selection={placedCursor}
                onSelectionChange={({ nativeEvent }) => {
                  cursor.current = nativeEvent.selection;
                  setPlacedCursor(undefined);
                }}
              />
              <PlaceholderChips placeholders={opened.placeholders} onInsert={insert} />
            </View>
            {/* The latest saved labels, which a save refetches while the message draft stays. */}
            {form.sectionLabels ? (
              <SectionLabelsCard
                block={form.sectionLabels}
                disabled={flow.saving}
                onEdit={() => sectionLabelsSheet.current?.open()}
              />
            ) : null}
            <PreviewCard
              answer={flow.answer}
              editLabelsDisabled={flow.saving}
              onEditLabels={() => labelsSheet.current?.open()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <SubpageFooter>
        <EditSaveActions flow={flow} disabled={!dirty} />
        {opened.secondaryAction.kind === 'remove' ? (
          <Button
            label={opened.secondaryAction.label}
            variant="ghost-danger"
            disabled={flow.saving}
            onPress={() => setRemoving(true)}
          />
        ) : (
          <Button label={opened.secondaryAction.label} variant="ghost" disabled={flow.saving} onPress={flow.leave} />
        )}
      </SubpageFooter>
      {/* The latest labels, not the opened ones: a labels save refetches the editor while the message draft stays. */}
      <LineLabelsSheet ref={labelsSheet} labels={form.labels} />
      {form.sectionLabels && form.personId ? (
        <SectionLabelsSheet ref={sectionLabelsSheet} recipientId={form.personId} block={form.sectionLabels} />
      ) : null}
      {opened.restore ? (
        <RestoreTemplateDialog
          open={restoring}
          kind={opened.kind}
          dialog={opened.restore.dialog}
          onClose={() => setRestoring(false)}
          onRestored={() => {
            showToast('Changes saved');
            onRestored();
          }}
        />
      ) : null}
      {opened.removeDialog && opened.personId ? (
        <RemoveTemplateDialog
          open={removing}
          kind={opened.kind}
          personId={opened.personId}
          dialog={opened.removeDialog}
          onClose={() => setRemoving(false)}
          onRemoved={() => {
            showToast('Changes saved');
            // Back to the landing page: the template is gone.
            if (router.canGoBack()) router.back();
            else router.replace({ pathname: '/settings/template/[kind]', params: { kind: opened.kind } });
          }}
        />
      ) : null}
    </Screen>
  );
}
