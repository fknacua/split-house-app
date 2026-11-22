import { Trash2 } from 'lucide-react-native';

import { ConfirmDialog } from '@/components';
import type { RemovePaymentDialogProps } from '../types';

/**
 * `Confirm` `removePayment`: asks before the charge goes back to unpaid, its text from the server.
 * While removing it can't be left; a failure stays open with the message, so Remove can be tried again.
 */
export function RemovePaymentDialog({ open, confirm, removing, error, onKeep, onRemove }: RemovePaymentDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      icon={Trash2}
      title={confirm?.title ?? ''}
      body={confirm?.body}
      cancelLabel={confirm?.cancelLabel ?? 'Keep'}
      onCancel={onKeep}
      confirmLabel={confirm?.confirmLabel ?? 'Remove'}
      onConfirm={onRemove}
      loading={removing}
      error={error}
    />
  );
}
