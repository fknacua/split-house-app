import { Undo } from 'lucide-react-native';

import { ConfirmDialog } from '@/components';
import type { DiscardEditDialogProps } from '../types';

/** `Confirm` `discard`: Cancel after the day changed asks before dropping it. */
export function DiscardEditDialog({ open, onKeepEditing, onDiscard }: DiscardEditDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      icon={Undo}
      title="Discard changes?"
      body="Your edits to this payment haven’t been saved. If you leave now, they’ll be lost."
      cancelLabel="Keep editing"
      onCancel={onKeepEditing}
      confirmLabel="Discard"
      onConfirm={onDiscard}
    />
  );
}
