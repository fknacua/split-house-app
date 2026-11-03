import { useRouter } from 'expo-router';
import { UserMinus } from 'lucide-react-native';

import { ConfirmDialog, DEFAULT_FAILED_MESSAGE, useSuccessToast } from '@/components';
import { useSaveHouseholdEdit } from '@/hooks';
import type { RemovePersonDialogProps } from '../types';
import { requestMessage } from '../use-edit-flow';

/**
 * The `removePerson` board, its text written by the server. They leave from next month, so there is no month to
 * pick. Removing returns to the overview with a toast; a refusal or a failure stays open with the message.
 */
export function RemovePersonDialog({ open, personId, dialog, onClose }: RemovePersonDialogProps) {
  const router = useRouter();
  const showToast = useSuccessToast();
  const remove = useSaveHouseholdEdit();

  return (
    <ConfirmDialog
      open={open}
      icon={UserMinus}
      title={dialog.title}
      body={dialog.body}
      items={dialog.keeps}
      cancelLabel="Cancel"
      onCancel={() => {
        remove.reset();
        onClose();
      }}
      confirmLabel="Remove from household"
      onConfirm={() =>
        remove.mutate(
          { kind: 'removePerson', personId },
          {
            onSuccess: () => {
              showToast('Changes saved');
              router.dismissTo('/household');
            },
          },
        )
      }
      loading={remove.isPending}
      error={remove.isError ? (requestMessage(remove.error) ?? DEFAULT_FAILED_MESSAGE) : undefined}
    />
  );
}
