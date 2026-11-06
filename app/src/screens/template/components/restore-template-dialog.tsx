import { Undo } from 'lucide-react-native';

import { ConfirmDialog, DEFAULT_FAILED_MESSAGE } from '@/components';
import { useRestoreTemplate } from '@/hooks';
import { requestMessage } from '@/screens/household-person';
import type { RestoreTemplateDialogProps } from '../types';

/**
 * The `restoreBreakdown` and `restoreNudge` boards, their text written by the server. Restoring saves the built-in
 * text as the Default right away and calls `onRestored`; a failure stays open with the message.
 */
export function RestoreTemplateDialog({ open, kind, dialog, onClose, onRestored }: RestoreTemplateDialogProps) {
  const restore = useRestoreTemplate();

  return (
    <ConfirmDialog
      open={open}
      icon={Undo}
      title={dialog.title}
      body={dialog.body}
      items={dialog.items}
      cancelLabel={dialog.cancelLabel}
      onCancel={() => {
        restore.reset();
        onClose();
      }}
      confirmLabel={dialog.confirmLabel}
      onConfirm={() => restore.mutate(kind, { onSuccess: onRestored })}
      loading={restore.isPending}
      error={restore.isError ? (requestMessage(restore.error) ?? DEFAULT_FAILED_MESSAGE) : undefined}
    />
  );
}
