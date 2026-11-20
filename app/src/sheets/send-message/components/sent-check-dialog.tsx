import { Send } from 'lucide-react-native';

import { ConfirmDialog } from '@/components';
import type { SentCheckDialogProps } from '../types';

/**
 * `Confirm` `sentCheck`: asked once the app is back from WhatsApp. "Yes, it was sent" records the
 * send; "Not yet" and the back gesture record nothing. A failed record shows in the dialog, which
 * stays open to try again.
 */
export function SentCheckDialog({ check, saving, error, onConfirm, onNotYet }: SentCheckDialogProps) {
  return (
    <ConfirmDialog
      open={check !== null}
      tone="neutral"
      icon={Send}
      title="Did you send the message?"
      body="Mark it as sent once it has gone out in WhatsApp."
      confirmLabel="Yes, it was sent"
      onConfirm={onConfirm}
      cancelLabel="Not yet"
      onCancel={onNotYet}
      loading={saving}
      error={error ?? undefined}
    />
  );
}
