import { useRouter } from 'expo-router';

import { useSuccessToast } from '@/components';
import { useDebouncedValue, useSaveTemplate, useTemplatePreview, useUnsavedGuard } from '@/hooks';
import { PREVIEW_DELAY_MS, requestMessage } from '@/screens/household-person';
import type { TemplatePreviewRequest } from '@splithouse/shared';

/**
 * What the template editor does with its draft: renders it as it changes, saves it and returns to the screen it came
 * from with a toast, and asks first when leaving with unsaved changes.
 *
 * @param draft The draft the form's values make now.
 * @param dirty Whether leaving would lose anything.
 * @param samplePersonId Who the nudge preview shows, or null with no samples. It only goes to the preview, never the save.
 * @returns The preview's answer, the save, the leave guard and what the footer shows.
 */
export function useTemplateFlow(draft: TemplatePreviewRequest, dirty: boolean, samplePersonId: string | null) {
  const router = useRouter();
  const save = useSaveTemplate();
  const showToast = useSuccessToast();
  const request = { ...draft, samplePersonId };
  const previewedRequest = useDebouncedValue(request, PREVIEW_DELAY_MS);
  const preview = useTemplatePreview(previewedRequest);
  const answered =
    !preview.isPlaceholderData &&
    preview.isSuccess &&
    JSON.stringify(request) === JSON.stringify(previewedRequest);
  const answer = preview.data;
  const errors = answer?.errors ?? {};

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };
  const guard = useUnsavedGuard({ dirty, busy: save.isPending, leave });

  const onSave = () =>
    save.mutate(draft, {
      onSuccess: () => {
        showToast('Changes saved');
        leave();
      },
    });

  return {
    /** The server's latest answer, kept while a new one loads. */
    answer,
    canSave: answered && answer?.canSave === true,
    errors,
    saving: save.isPending,
    // A failed save stops counting once the values change, so the button reads Save changes again.
    failed: save.isError && JSON.stringify(save.variables) === JSON.stringify(draft),
    saveError: save.error,
    noticeError: errors.form ?? requestMessage(preview.error),
    onSave,
    guard,
  };
}
