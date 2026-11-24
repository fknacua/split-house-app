import { Trash2 } from 'lucide-react-native';

import { ConfirmDialog } from '@/components';
import type { DeleteCorrectionDialogProps } from '../types';

/**
 * `Confirm` `deleteCorrection` (and `deleteCorrectionPaid`, whose body adds that its payment goes too), its text from
 * the server. While deleting it can't be left; a failure stays open with the message, so Delete can be tried again.
 */
export function DeleteCorrectionDialog({ open, confirm, deleting, error, onKeep, onDelete }: DeleteCorrectionDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      icon={Trash2}
      title={confirm.title}
      body={confirm.body}
      cancelLabel={confirm.cancelLabel}
      onCancel={onKeep}
      confirmLabel={confirm.confirmLabel}
      onConfirm={onDelete}
      loading={deleting}
      error={error}
    />
  );
}
