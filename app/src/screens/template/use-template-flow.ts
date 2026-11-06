import { useRouter } from 'expo-router';

import { useSuccessToast } from '@/components';
import { useDebouncedValue, useSaveTemplate, useTemplatePreview, useUnsavedGuard } from '@/hooks';
import { PREVIEW_DELAY_MS, requestMessage } from '@/screens/household-person';
import { templateMessageSchemas, type TemplatePreviewRequest, type TemplateSaveRequest } from '@splithouse/shared';

/**
 * What the template editor does with its draft: checks it with the shared message rules, renders it as it changes,
 * saves it and returns to the screen it came from with a toast, and asks first when leaving with unsaved changes.
 *
 * @param draft The draft the form's values make now.
 * @param dirty Whether leaving would lose anything.
 * @returns The preview's answer, the save, the leave guard and what the footer shows.
 */
export function useTemplateFlow(draft: TemplatePreviewRequest, dirty: boolean) {
  const router = useRouter();
  const save = useSaveTemplate();
  const showToast = useSuccessToast();
  const previewedRequest = useDebouncedValue(draft, PREVIEW_DELAY_MS);
  const preview = useTemplatePreview(previewedRequest);
  const checked = templateMessageSchemas[draft.template].safeParse(draft.text);
  // Over the limit has no message: a counter shows it instead.
  const textError = checked.success ? undefined : checked.error.issues[0]?.message || undefined;

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };
  const guard = useUnsavedGuard({ dirty, busy: save.isPending, leave });

  const onSave = () =>
    // The checks above ran with the same schema the save request is parsed with.
    save.mutate(draft as TemplateSaveRequest, {
      onSuccess: () => {
        showToast('Changes saved');
        leave();
      },
    });

  return {
    /** The server's latest answer, kept while a new one loads. */
    answer: preview.data,
    canSave: checked.success,
    errors: { text: textError },
    saving: save.isPending,
    // A failed save stops counting once the values change, so the button reads Save changes again.
    failed: save.isError && JSON.stringify(save.variables) === JSON.stringify(draft),
    saveError: save.error,
    // Empty shows no notice.
    noticeError: requestMessage(preview.error) ?? '',
    onSave,
    guard,
  };
}
