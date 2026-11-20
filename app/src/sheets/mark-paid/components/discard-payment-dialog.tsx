import { Undo } from 'lucide-react-native';

import { ConfirmDialog } from '@/components';
import type { DiscardPaymentDialogProps } from '../types';

/** `Confirm` `discardPayment`: Cancel with changes asks before dropping them. */
export function DiscardPaymentDialog({ open, onKeepEditing, onDiscard }: DiscardPaymentDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      icon={Undo}
      title="Discard this payment?"
      body="This payment hasn’t been recorded yet. If you leave now, what you entered will be lost."
      cancelLabel="Keep editing"
      onCancel={onKeepEditing}
      confirmLabel="Discard"
      onConfirm={onDiscard}
    />
  );
}
