import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import {
  BottomSheet,
  BottomSheetBackdrop,
  BottomSheetPortal,
  BottomSheetScrollView,
  type BottomSheetRef,
} from '@/components/ui/bottomsheet';

/** What a screen can call on an `AppSheet` through its ref. */
export interface AppSheetRef {
  /** Slides the sheet up. */
  open: () => void;
  /** Slides the sheet down and dismisses the keyboard. */
  close: () => void;
}

/** Shown in the failed state when the screen gives no message (copy from the design source). */
const DEFAULT_FAILED_MESSAGE = "Couldn't save. Check your connection and try again.";

/** The grabber: 32 x 4 on the `track` token, 10px from the top edge (design source). */
function Grabber() {
  return (
    <View className="items-center pb-3 pt-2.5">
      <View className="h-1 w-8 rounded-sm bg-track" />
    </View>
  );
}

/**
 * Sheet scaffold (screen mapping doc: Bottom sheet). Wraps the native gluestack bottom sheet with
 * the shared frame: grabber, 20/28 title with an optional subtitle, a scrolling body and a sticky
 * footer with the main action and a Cancel text button under it. There is no close icon; the
 * sheet is also dismissed by swiping down, tapping the scrim or the back gesture. Used by Add
 * charge, Mark paid, Record payment, Mark bill paid and Share bill.
 *
 * While `saving` the body ignores touches, the action shows its spinner, and Cancel, the
 * swipe-down and a tap on the scrim stop closing the sheet. When `failed` a danger Alert sits above
 * the footer and the action reads "Retry"; the body stays mounted, so typed values are kept.
 *
 * Screens should also pass `disabled` to their own fields while `saving`, so they show the
 * disabled look. Open and close the sheet through the ref.
 *
 * @param title - The sheet title.
 * @param subtitle - Optional one-line caption under the title, such as "Money you received for November".
 * @param cancelLabel - The text button under the action. Defaults to "Cancel".
 * @param children - The body content, placed in a padded column that scrolls.
 * @param actionLabel - The main action's label, for example "Add charge".
 * @param onAction - Called when the action is tapped. Not called while `saving` or `disabled`.
 * @param saving - Show the spinner on the action and lock the sheet.
 * @param failed - Show the failed-save Alert and turn the action into "Retry".
 * @param failedMessage - Replaces the default failed-save text.
 * @param disabled - Show the action in its disabled look, such as when a form is invalid.
 * @param snapPoint - The sheet height, such as `'90%'`. Defaults to `'90%'`.
 * @param onClose - Called after the sheet has closed, by any route.
 */
export const AppSheet = forwardRef<
  AppSheetRef,
  {
    title: string;
    subtitle?: string;
    cancelLabel?: string;
    children: ReactNode;
    actionLabel: string;
    onAction?: () => void;
    saving?: boolean;
    failed?: boolean;
    failedMessage?: string;
    disabled?: boolean;
    snapPoint?: string;
    onClose?: () => void;
  }
>(function AppSheet(
  {
    title,
    subtitle,
    cancelLabel = 'Cancel',
    children,
    actionLabel,
    onAction,
    saving = false,
    failed = false,
    failedMessage = DEFAULT_FAILED_MESSAGE,
    disabled = false,
    snapPoint = '90%',
    onClose,
  },
  ref
) {
  const sheetRef = useRef<BottomSheetRef>(null);
  const insets = useSafeAreaInsets();

  useImperativeHandle(
    ref,
    () => ({
      open: () => sheetRef.current?.open(),
      close: () => sheetRef.current?.close(),
    }),
    []
  );

  return (
    <BottomSheet ref={sheetRef} onClose={onClose}>
      <BottomSheetPortal
        snapPoints={[snapPoint]}
        enablePanDownToClose={!saving}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        handleComponent={Grabber}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} pressBehavior={saving ? 'none' : 'close'} />
        )}
      >
        {/* Not BottomSheetContent: it is absolute with no bottom edge, so it grows with its content
            (the footer ends up off-screen and the scroll view never gets a height), and it
            registers the sheet as a plain view, which breaks scroll-versus-drag handling. */}
        <View className="absolute inset-0">
          <View className="px-4">
            <Text
              accessibilityRole="header"
              className="font-manrope-extrabold text-sheet-title text-foreground"
            >
              {title}
            </Text>
            {subtitle ? (
              <Text className="font-manrope-medium text-caption text-on-surface-variant">
                {subtitle}
              </Text>
            ) : null}
          </View>

          <BottomSheetScrollView keyboardShouldPersistTaps="handled">
            <View pointerEvents={saving ? 'none' : 'auto'} className="gap-4 px-4 py-3">
              {children}
            </View>
          </BottomSheetScrollView>

          <View className="gap-3 px-4 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
            {failed ? <Alert variant="danger" message={failedMessage} /> : null}
            <Button
              label={failed ? 'Retry' : actionLabel}
              loading={saving}
              disabled={disabled}
              onPress={onAction}
            />
            <Button
              variant="ghost"
              label={cancelLabel}
              disabled={saving}
              onPress={() => sheetRef.current?.close()}
            />
          </View>
        </View>
      </BottomSheetPortal>
    </BottomSheet>
  );
});
