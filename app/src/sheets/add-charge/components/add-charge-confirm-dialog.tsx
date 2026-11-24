import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { ConfirmDetailRow, ConfirmDialog, ConfirmExpandRow } from '@/components';
import type { AddChargeConfirmDialogProps } from '../types';

/**
 * `Confirm` `addCharge` or `addCorrection`: asked before saving. A charge has no body text: What it’s for, Amount,
 * then `Split per person` (collapsed, opening to each person's amount) or Personal's `Who`, then Due date. A
 * correction says it will be linked to the original, then For, New amount, Outcome and a higher one's Due date.
 * Every string comes from the server. While saving the action shows its spinner and the dialog can't be left.
 */
export function AddChargeConfirmDialog({ open, confirm, saving, onConfirm, onGoBack }: AddChargeConfirmDialogProps) {
  // The sheet remounts the dialog for each Save tap, so the split starts collapsed every time.
  const [expanded, setExpanded] = useState(false);

  if (!confirm) return null;
  return (
    <ConfirmDialog
      open={open}
      tone="neutral"
      icon={Check}
      title={confirm.title}
      body={confirm.body ?? undefined}
      details={
        <View className="mt-2 rounded-xl bg-background px-3.5 py-1">
          {confirm.rows.map((row, index) =>
            row.items ? (
              <ConfirmExpandRow
                key={row.label}
                label={row.label}
                value={row.value}
                items={row.items}
                expanded={expanded}
                onToggle={() => setExpanded((e) => !e)}
              />
            ) : (
              <ConfirmDetailRow key={row.label} first={index === 0} label={row.label} value={row.value} />
            ),
          )}
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
