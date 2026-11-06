import { useRouter } from 'expo-router';

import { useSuccessToast } from '@/components';
import { useDebouncedValue, useSaveTemplate, useTemplatePreview } from '@/hooks';
import { PREVIEW_DELAY_MS, requestMessage } from '@/screens/household-person';
import type { TemplatePreviewRequest, TemplateSaveRequest } from '@splithouse/shared';

/**
 * What the template editor does with its draft: renders it as it changes, saves it and returns to the screen it came
 * from with a toast. Leaving drops unsaved edits without asking, as drawn.
 *
 * @param draft The draft the form's values make now.
 * @param valid Whether the form's shared message rules pass.
 * @returns The preview's answer, the save, `leave` and what the footer shows.
 */
export function useTemplateFlow(draft: TemplatePreviewRequest, valid: boolean) {
  const router = useRouter();
  const save = useSaveTemplate();
  const showToast = useSuccessToast();
  const previewedRequest = useDebouncedValue(draft, PREVIEW_DELAY_MS);
  const preview = useTemplatePreview(previewedRequest);

  const leave = () => {
    if (save.isPending) return;
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  const onSave = () =>
    // `valid` comes from the same schema the save request is parsed with.
    save.mutate(draft as TemplateSaveRequest, {
      onSuccess: () => {
        showToast('Changes saved');
        leave();
      },
    });

  return {
    /** The server's latest answer, kept while a new one loads. */
    answer: preview.data,
    canSave: valid,
    saving: save.isPending,
    // A failed save stops counting once the values change, so the button reads Save changes again.
    failed: save.isError && JSON.stringify(save.variables) === JSON.stringify(draft),
    saveError: save.error,
    // Empty shows no notice.
    noticeError: requestMessage(preview.error) ?? '',
    onSave,
    leave,
  };
}
