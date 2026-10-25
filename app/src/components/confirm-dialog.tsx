import { Check, type LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Icon } from '@/components/ui/icon';

/** The dialog's mood: `danger` for destructive confirmations, `warning` for "check this first". */
export type ConfirmDialogTone = 'danger' | 'warning';

/** How the extra lines are drawn: a check icon (what stays) or a bullet (what to check). */
export type ConfirmDialogListStyle = 'check' | 'bullet';

const ICON_CIRCLE: Record<ConfirmDialogTone, string> = {
  danger: 'bg-danger-line',
  warning: 'border border-warning-line bg-warning-tint',
};

const ICON_COLOR: Record<ConfirmDialogTone, string> = {
  danger: 'text-on-danger-tint',
  warning: 'text-warning',
};

/**
 * Dialog scaffold (screen mapping doc: Confirmations). Wraps the native gluestack alert dialog
 * with the shared layout: a round icon, a centred 20/28 title, a body, an optional list, and two
 * stacked buttons. The first button is the safe way out, filled; the second is the action, an
 * outline. Used by Remove person, Remove version, Discard changes and Save with warnings.
 *
 * There is no close icon, and a tap on the scrim does nothing: the dialog is left through one of
 * the two buttons or the Android back gesture, which calls `onCancel`. While `loading`, the action
 * button shows its Spinner, Cancel is disabled and the back gesture does nothing, so the dialog
 * cannot be dismissed until the work finishes.
 *
 * @param open - Whether the dialog is shown.
 * @param tone - `danger` (red icon, red outline action) or `warning` (amber icon, neutral outline
 *   action). Defaults to `danger`.
 * @param icon - The Lucide icon in the circle, such as `Trash2` or `TriangleAlert`.
 * @param title - The dialog title.
 * @param body - Optional paragraph under the title.
 * @param items - Optional extra lines under the body, such as what stays or what to check.
 * @param itemStyle - `check` (what stays) or `bullet` (what to check). Defaults to `check`.
 * @param cancelLabel - The filled, safe button, such as "Cancel" or "Keep editing".
 * @param onCancel - Called by the safe button and the Android back gesture.
 * @param confirmLabel - The outlined action, such as "Remove from household".
 * @param onConfirm - Called by the action button.
 * @param loading - The action is in progress: Spinner on the action button, Cancel disabled, dialog
 *   cannot be dismissed. Defaults to false.
 * @param error - Message of a failed action, drawn as a danger Alert above the buttons. The dialog
 *   stays open so the action can be tried again.
 */
export function ConfirmDialog({
  open,
  tone = 'danger',
  icon,
  title,
  body,
  items,
  itemStyle = 'check',
  cancelLabel = 'Cancel',
  onCancel,
  confirmLabel,
  onConfirm,
  loading = false,
  error,
}: {
  open: boolean;
  tone?: ConfirmDialogTone;
  icon: LucideIcon;
  title: string;
  body?: string;
  items?: string[];
  itemStyle?: ConfirmDialogListStyle;
  cancelLabel?: string;
  onCancel: () => void;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  error?: string;
}) {
  return (
    <AlertDialog isOpen={open} onClose={loading ? () => {} : onCancel} closeOnOverlayClick={false}>
      <AlertDialogBackdrop />
      <AlertDialogContent className="gap-4">
        <View
          className={`size-12 items-center justify-center self-center rounded-full ${ICON_CIRCLE[tone]}`}
        >
          <Icon as={icon} className={`size-[22px] ${ICON_COLOR[tone]}`} />
        </View>
        <Text
          accessibilityRole="header"
          className="text-center font-manrope-extrabold text-sheet-title text-foreground"
        >
          {title}
        </Text>
        <AlertDialogBody contentContainerClassName="gap-2">
          {body ? (
            <Text
              className={`font-manrope-medium text-label ${
                // The "check these" lead-in is stronger than its muted bullets.
                itemStyle === 'bullet' ? 'text-foreground' : 'text-on-surface-variant'
              }`}
            >
              {body}
            </Text>
          ) : null}
          {items?.map((item) => (
            <View key={item} className="flex-row items-start gap-2">
              {itemStyle === 'check' ? (
                <Icon as={Check} size="sm" className="mt-0.5 text-on-surface-variant" />
              ) : (
                <View className="mx-1 mt-2 size-1.5 rounded-full bg-warning" />
              )}
              <Text
                className="flex-1 font-manrope-medium text-label text-on-surface-variant"
              >
                {item}
              </Text>
            </View>
          ))}
        </AlertDialogBody>
        {error ? <Alert variant="danger" message={error} /> : null}
        <AlertDialogFooter className="flex-col items-stretch gap-2 pt-1">
          <Button label={cancelLabel} onPress={onCancel} disabled={loading} />
          <Button
            label={confirmLabel}
            onPress={onConfirm}
            loading={loading}
            variant={tone === 'danger' ? 'outline-danger' : 'outline'}
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
