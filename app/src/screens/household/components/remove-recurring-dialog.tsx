import { Trash2 } from 'lucide-react-native';

import { ConfirmDialog, DEFAULT_FAILED_MESSAGE, useSuccessToast } from '@/components';
import { useSaveHouseholdEdit } from '@/hooks';
import { requestMessage } from '@/screens/household-person';
import type { RemoveRecurringDialogProps } from '../types';

/**
 * Asks before stopping a recurring charge, not drawn, its text written by the server. It stops from next month, so
 * there is no month to pick. A failure stays open with the message.
 */
export function RemoveRecurringDialog({ charge, onClose }: RemoveRecurringDialogProps) {
  const showToast = useSuccessToast();
  const remove = useSaveHouseholdEdit();

  return (
    <ConfirmDialog
      open={charge !== null}
      icon={Trash2}
      title={charge?.removeDialog.title ?? ''}
      body={charge?.removeDialog.body}
      cancelLabel="Cancel"
      onCancel={() => {
        remove.reset();
        onClose();
      }}
      confirmLabel="Remove charge"
      onConfirm={() => {
        if (!charge) return;
        remove.mutate(
          { kind: 'removeRecurring', chargeId: charge.chargeId },
          {
            onSuccess: () => {
              showToast('Changes saved');
              onClose();
            },
          },
        );
      }}
      loading={remove.isPending}
      error={remove.isError ? (requestMessage(remove.error) ?? DEFAULT_FAILED_MESSAGE) : undefined}
    />
  );
}
