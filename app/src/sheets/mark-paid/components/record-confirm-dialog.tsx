import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ConfirmDialog, Icon } from '@/components';
import type { RecordConfirmDialogProps } from '../types';
import { ConfirmDetailRow } from './confirm-detail-row';

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
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`${confirm.for.label}, ${confirm.for.value}`}
                onPress={() => setExpanded((e) => !e)}
                className="min-h-11 flex-row items-center justify-between gap-3 border-t border-outline-variant py-2.5 active:opacity-70"
              >
                <Text className="font-manrope-semibold text-label text-on-surface-variant">{confirm.for.label}</Text>
                <View className="flex-row items-center gap-1">
                  <Text className="font-manrope-bold text-label text-on-surface">{confirm.for.value}</Text>
                  <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
                    <Icon as={ChevronDown} size={16} className="text-on-surface-variant" />
                  </View>
                </View>
              </Pressable>
              {expanded
                ? items.map((item) => (
                    <View
                      key={item.label}
                      className="mb-2 ml-1 flex-row items-baseline justify-between gap-3 border-l-2 border-outline-variant py-0.5 pl-3"
                    >
                      <Text className="font-manrope-medium text-caption text-on-surface-variant">{item.label}</Text>
                      <Text
                        className="font-manrope-semibold text-caption text-on-surface-variant"
                        style={{ fontVariant: ['tabular-nums'] }}
                      >
                        {item.value}
                      </Text>
                    </View>
                  ))
                : null}
            </>
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
