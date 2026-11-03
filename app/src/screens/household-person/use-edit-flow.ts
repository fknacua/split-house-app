import { useRouter } from 'expo-router';

import { useSuccessToast } from '@/components';
import { useDebouncedValue, useHouseholdEditPreview, useSaveHouseholdEdit, useUnsavedGuard } from '@/hooks';
import { ApiRequestError } from '@/lib/api';
import type { HouseholdEdit } from '@splithouse/shared';

/** How long the form has to stay still before the server previews it, in milliseconds. */
const PREVIEW_DELAY_MS = 500;

/**
 * The message for a failed request, or null for an unreachable server, which the app's own prompt covers.
 *
 * @param error The request's error.
 * @returns The message to show, or null.
 */
export const requestMessage = (error: Error | null) => (error instanceof ApiRequestError ? error.message : null);

/**
 * What a Household form does with its edit: previews it as it changes, saves it and returns to the overview with
 * a toast, and asks first when leaving with unsaved changes.
 *
 * @param edit The edit the form's values make now.
 * @param dirty Whether leaving would lose anything.
 * @returns The preview's answer, the save, the leave guard and what the footer shows.
 */
export function useEditFlow(edit: HouseholdEdit, dirty: boolean) {
  const router = useRouter();
  const save = useSaveHouseholdEdit();
  const showToast = useSuccessToast();
  const previewedEdit = useDebouncedValue(edit, PREVIEW_DELAY_MS);
  const preview = useHouseholdEditPreview(previewedEdit);
  const answered =
    !preview.isPlaceholderData &&
    preview.isSuccess &&
    JSON.stringify(edit) === JSON.stringify(previewedEdit);
  const answer = preview.data;
  const errors = answer?.errors ?? {};

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/household');
  };
  const guard = useUnsavedGuard({ dirty, busy: save.isPending, leave });

  const onSave = () =>
    save.mutate(edit, {
      onSuccess: () => {
        showToast('Changes saved');
        router.dismissTo('/household');
      },
    });

  return {
    /** The server's answer is for the values on screen. */
    answered,
    /** The preview request itself failed. */
    previewFailed: preview.isError,
    canSave: answered && answer?.canSave === true,
    groups: answer?.groups ?? [],
    errors,
    saving: save.isPending,
    // A failed save stops counting once the values change, so the button reads Save changes again.
    failed: save.isError && JSON.stringify(save.variables) === JSON.stringify(edit),
    saveError: save.error,
    noticeError: errors.form ?? requestMessage(preview.error),
    onSave,
    guard,
  };
}
