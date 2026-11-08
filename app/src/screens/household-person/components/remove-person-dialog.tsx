import { useRouter } from 'expo-router';
import { UserMinus } from 'lucide-react-native';

import { ConfirmDialog, DEFAULT_FAILED_MESSAGE, useSuccessToast } from '@/components';
import { useBootstrap, useSaveHouseholdEdit } from '@/hooks';
import type { RemovePersonDialogProps } from '../types';
import { requestMessage } from '../use-edit-flow';

/**
 * The `removePerson` board, its text written by the server. They leave from next month, so there is no month to
 * pick. Removing returns to the overview with a toast (in First run, to People); a refusal or a failure stays open
 * with the message. In First run the text has no room line and no check lines.
 */
export function RemovePersonDialog({ open, personId, dialog, onClose }: RemovePersonDialogProps) {
  const router = useRouter();
  const showToast = useSuccessToast();
  const remove = useSaveHouseholdEdit();
  const setupComplete = useBootstrap().data?.setupComplete ?? true;

  return (
    <ConfirmDialog
      open={open}
      icon={UserMinus}
      title={dialog.title}
      body={dialog.body}
      note={dialog.roomLine ?? undefined}
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
              // In First run there is no Household tab: the person was opened from People.
              router.dismissTo(setupComplete ? '/household' : '/setup/people');
            },
          },
        )
      }
      loading={remove.isPending}
      error={remove.isError ? (requestMessage(remove.error) ?? DEFAULT_FAILED_MESSAGE) : undefined}
    />
  );
}
