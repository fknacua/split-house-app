import { Undo } from 'lucide-react-native';

import { ConfirmDialog } from '@/components';
import type { DiscardChargeDialogProps } from '../types';

/** `Confirm` `discardCharge`: Cancel with changes asks before dropping them. */
export function DiscardChargeDialog({ open, onKeepEditing, onDiscard }: DiscardChargeDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      icon={Undo}
      title="Discard this charge?"
      body="This charge hasn’t been added yet. If you leave now, what you entered will be lost."
      cancelLabel="Keep editing"
      onCancel={onKeepEditing}
      confirmLabel="Discard"
      onConfirm={onDiscard}
    />
  );
}
