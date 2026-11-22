import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { ConfirmDetailRow, ConfirmDialog, ConfirmExpandRow } from '@/components';
import type { RecordConfirmDialogProps } from '../types';

/**
 * `Confirm` `recordPayment` and `recordMulti`: asked before recording, with From, For, Amount received
 * and Received on. With several charges For reads `3 charges` and opens to list each; it starts
 * closed. While saving (`recordSaving`) the action shows its spinner and the dialog can't be left.
 */
export function RecordConfirmDialog({ open, confirm, receivedOn, saving, onConfirm, onGoBack }: RecordConfirmDialogProps) {
  // The sheet remounts the dialog for each Record tap, so For starts closed every time.
  const [expanded, setExpanded] = useState(false);

  if (!confirm) return null;
  const items = confirm.for.items;
  return (
    <ConfirmDialog
      open={open}
      tone="neutral"
      icon={Check}
      title={confirm.title}
      body={confirm.body}
      details={
        <View className="mt-2 rounded-xl bg-background px-3.5 py-1">
          <ConfirmDetailRow first label={confirm.from.label} value={confirm.from.value} />
          {items ? (
            <ConfirmExpandRow
              label={confirm.for.label}
              value={confirm.for.value}
              items={items}
              expanded={expanded}
              onToggle={() => setExpanded((e) => !e)}
            />
          ) : (
            <ConfirmDetailRow label={confirm.for.label} value={confirm.for.value} />
          )}
          <ConfirmDetailRow label={confirm.amount.label} value={confirm.amount.value} />
          <ConfirmDetailRow label={confirm.receivedOnLabel} value={receivedOn} />
        </View>
      }
      confirmLabel={confirm.confirmLabel}
      onConfirm={onConfirm}
      cancelLabel={confirm.cancelLabel}
      onCancel={onGoBack}
      loading={saving}
    />
  );
}
