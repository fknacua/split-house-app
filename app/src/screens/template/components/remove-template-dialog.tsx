import { Trash2 } from 'lucide-react-native';

import { ConfirmDialog, DEFAULT_FAILED_MESSAGE } from '@/components';
import { useRemoveTemplate } from '@/hooks';
import { requestMessage } from '@/screens/household-person';
import type { RemoveTemplateDialogProps } from '../types';

/**
 * The `removeVersion` and `removeNudge` boards, their text written by the server. Removing calls `onRemoved`; a
 * failure stays open with the message.
 */
export function RemoveTemplateDialog({ open, kind, personId, dialog, onClose, onRemoved }: RemoveTemplateDialogProps) {
  const remove = useRemoveTemplate();

  return (
    <ConfirmDialog
      open={open}
      icon={Trash2}
      title={dialog.title}
      body={dialog.body}
      cancelLabel={dialog.cancelLabel}
      onCancel={() => {
        remove.reset();
        onClose();
      }}
      confirmLabel={dialog.confirmLabel}
      onConfirm={() => remove.mutate({ kind, personId }, { onSuccess: onRemoved })}
      loading={remove.isPending}
      error={remove.isError ? (requestMessage(remove.error) ?? DEFAULT_FAILED_MESSAGE) : undefined}
    />
  );
}
