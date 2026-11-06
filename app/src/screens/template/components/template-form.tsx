import { useRouter } from 'expo-router';
import { Undo } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import {
  Button,
  ConfirmDialog,
  Screen,
  SubpageFooter,
  SubpageHeader,
  TextareaInput,
  useSuccessToast,
} from '@/components';
import { EditSaveActions } from '@/screens/household-person';
import { hasTemplateChanges, insertAtCursor, toTemplateDraft, toTemplateFormValues, type TemplateFormValues, type TextSelection } from '../helpers';
import type { TemplateFormProps } from '../types';
import { useTemplateFlow } from '../use-template-flow';
import { PlaceholderChips } from './placeholder-chips';
import { PreviewCard } from './preview-card';
import { RemoveTemplateDialog } from './remove-template-dialog';

/**
 * The template editor: the message with chips that insert at the cursor, checked with the shared message rules, and a
 * preview the server renders. A save applies immediately. Leaving with unsaved changes asks first.
 */
export function TemplateForm({ form }: TemplateFormProps) {
  // The refetch after a save changes the response while the screen is closing, so the form keeps what it opened on.
  const [opened] = useState(form);
  const { control, setValue, setFocus } = useForm<TemplateFormValues>({ defaultValues: toTemplateFormValues(opened) });
  const values = useWatch({ control }) as TemplateFormValues;
  const dirty = hasTemplateChanges(values, opened);
  const flow = useTemplateFlow(toTemplateDraft(values, opened), dirty);
  const { guard, errors } = flow;
  const router = useRouter();
  const showToast = useSuccessToast();
  const [removing, setRemoving] = useState(false);

  const cursor = useRef<TextSelection>({ start: opened.text.length, end: opened.text.length });
  // Set for the render after an insert, then handed back so the user can move the cursor.
  const [placedCursor, setPlacedCursor] = useState<TextSelection | undefined>(undefined);

  const insert = (placeholder: string) => {
    const next = insertAtCursor(values.text, cursor.current, placeholder);
    setValue('text', next.text);
    cursor.current = { start: next.cursor, end: next.cursor };
    setPlacedCursor(cursor.current);
    setFocus('text');
  };

  return (
    <Screen>
      <SubpageHeader title={opened.title} subtitle={opened.sub} onBack={guard.requestLeave} />
      {/* Edge-to-edge Android does not resize for the keyboard, so the padding keeps the focused field in view. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-4 pb-4 pt-2">
          <View pointerEvents={flow.saving ? 'none' : 'auto'} className="gap-4">
            <View className="gap-2">
              <TextareaInput
                lines={6}
                maxLines={12}
                autoCapitalize="sentences"
                selection={placedCursor}
                onSelectionChange={({ nativeEvent }) => {
                  cursor.current = nativeEvent.selection;
                  setPlacedCursor(undefined);
                }}
                fieldControlProps={{ control, name: 'text', label: 'Message', error: errors.text }}
              />
              <PlaceholderChips placeholders={opened.placeholders} onInsert={insert} />
            </View>
            <PreviewCard answer={flow.answer} />
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
          <Button label={opened.secondaryAction.label} variant="ghost" disabled={flow.saving} onPress={guard.requestLeave} />
        )}
      </SubpageFooter>
      {opened.removeDialog && opened.personId ? (
        <RemoveTemplateDialog
          open={removing}
          kind={opened.kind}
          personId={opened.personId}
          dialog={opened.removeDialog}
          onClose={() => setRemoving(false)}
          onRemoved={() => {
            showToast('Changes saved');
            // Back to the landing page, past the unsaved-changes guard: the template is gone.
            if (router.canGoBack()) router.back();
            else router.replace({ pathname: '/settings/template/[kind]', params: { kind: opened.kind } });
          }}
        />
      ) : null}
      <ConfirmDialog
        open={guard.asking}
        icon={Undo}
        title="Discard changes?"
        body="Your edits to this template haven’t been saved. If you leave now, they’ll be lost."
        cancelLabel="Keep editing"
        onCancel={guard.keepEditing}
        confirmLabel="Discard"
        onConfirm={guard.discard}
      />
    </Screen>
  );
}
