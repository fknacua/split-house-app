import { forwardRef, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
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
import { InSheetContext } from '@/components/ui/bottomsheet/sheet-aware-text-input';

/** What a screen can call on an `AppSheet` through its ref. */
export interface AppSheetRef {
  /** Slides the sheet up. */
  open: () => void;
  /** Slides the sheet down and dismisses the keyboard. */
  close: () => void;
}

/** Shown in the failed state when the screen gives no message (copy from the design source). */
export const DEFAULT_FAILED_MESSAGE = "Couldn't save. Check your connection and try again.";

/** The grabber's height: 10 above the bar, the 4px bar, 12 below. */
const GRABBER_HEIGHT = 26;

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
 * @param dangerAction - Replaces Cancel with a red text button, such as "Remove charge". The sheet still
 *   closes by swiping down, tapping the scrim or the back gesture.
 * @param children - The body content, placed in a padded column that scrolls.
 * @param actionLabel - The main action's label, for example "Add charge". Leave it out for a sheet that
 *   acts on a tap in its body (Nudge about which charge?): then only Cancel shows.
 * @param onAction - Called when the action is tapped. Not called while `saving` or `disabled`.
 * @param saving - Show the spinner on the action and lock the sheet.
 * @param failed - Show the failed-save Alert and turn the action into "Retry".
 * @param failedMessage - Replaces the default failed-save text.
 * @param disabled - Show the action in its disabled look, such as when a form is invalid.
 * @param snapPoint - The sheet height, such as `'90%'`. Defaults to `'90%'`.
 * @param fitContent - Size the sheet to its title, body and footer instead, up to `snapPoint`'s share of the screen.
 *   Past that the body scrolls between the pinned title and footer.
 * @param actionsInRow - Put Cancel (outline) and the action side by side, Cancel first, instead of the action with a
 *   Cancel text button under it. Ignored with `dangerAction` or without `actionLabel`.
 * @param onClose - Called after the sheet has closed, by any route.
 */
export const AppSheet = forwardRef<
  AppSheetRef,
  {
    title: string;
    subtitle?: string;
    cancelLabel?: string;
    dangerAction?: { label: string; onPress: () => void };
    children: ReactNode;
    actionLabel?: string;
    onAction?: () => void;
    saving?: boolean;
    failed?: boolean;
    failedMessage?: string;
    disabled?: boolean;
    snapPoint?: string;
    fitContent?: boolean;
    actionsInRow?: boolean;
    onClose?: () => void;
  }
>(function AppSheet(
  {
    title,
    subtitle,
    cancelLabel = 'Cancel',
    dangerAction,
    children,
    actionLabel,
    onAction,
    saving = false,
    failed = false,
    failedMessage = DEFAULT_FAILED_MESSAGE,
    disabled = false,
    snapPoint = '90%',
    fitContent = false,
    actionsInRow = false,
    onClose,
  },
  ref
) {
  const sheetRef = useRef<BottomSheetRef>(null);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // The title, body content and footer heights, measured for `fitContent`.
  const [heights, setHeights] = useState({ header: 0, body: 0, footer: 0 });
  const measure = (part: keyof typeof heights, height: number) =>
    setHeights((h) => (h[part] === height ? h : { ...h, [part]: height }));
  const sheetHeight = fitContent
    ? Math.min(
        GRABBER_HEIGHT + heights.header + heights.body + heights.footer,
        (windowHeight * parseFloat(snapPoint)) / 100
      )
    : null;
  const rowActions = actionsInRow && !!actionLabel && !dangerAction;

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
        snapPoints={[sheetHeight ?? snapPoint]}
        enablePanDownToClose={!saving}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        // Not adjustResize: there the sheet waits for Android to shrink the window, which edge-to-edge never does,
        // so the keyboard covered the lower fields. With adjustPan the sheet lifts itself above the keyboard.
        android_keyboardInputMode="adjustPan"
        handleComponent={Grabber}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} pressBehavior={saving ? 'none' : 'close'} />
        )}
      >
        {/* Not BottomSheetContent: it is absolute with no bottom edge, so it grows with its content
            (the footer ends up off-screen and the scroll view never gets a height), and it
            registers the sheet as a plain view, which breaks scroll-versus-drag handling.
            Not absolute either: the sheet adds bottom padding for over-drag below its visible edge,
            and an absolute child fills that too, which pushes the footer's last button off-screen. */}
        <View className="flex-1">
          <View className="px-4" onLayout={(e) => measure('header', e.nativeEvent.layout.height)}>
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

          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={(_, height) => measure('body', height)}
          >
            <View pointerEvents={saving ? 'none' : 'auto'} className="gap-4 px-4 py-3">
              {/* The fields in the body use the sheet's own text input, so the sheet moves above the keyboard. */}
              <InSheetContext.Provider value={true}>{children}</InSheetContext.Provider>
            </View>
          </BottomSheetScrollView>

          <View
            className="gap-3 px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 16 }}
            onLayout={(e) => measure('footer', e.nativeEvent.layout.height)}
          >
            {failed ? <Alert variant="danger" message={failedMessage} /> : null}
            {rowActions ? (
              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  label={cancelLabel}
                  disabled={saving}
                  className="flex-1"
                  onPress={() => sheetRef.current?.close()}
                />
                <Button
                  label={failed ? 'Retry' : actionLabel}
                  loading={saving}
                  disabled={disabled}
                  className="flex-1"
                  onPress={onAction}
                />
              </View>
            ) : actionLabel ? (
              <Button
                label={failed ? 'Retry' : actionLabel}
                loading={saving}
                disabled={disabled}
                onPress={onAction}
              />
            ) : null}
            {rowActions ? null : dangerAction ? (
              <Button
                variant="ghost-danger"
                label={dangerAction.label}
                disabled={saving}
                onPress={dangerAction.onPress}
              />
            ) : (
              <Button
                variant="ghost"
                label={cancelLabel}
                disabled={saving}
                onPress={() => sheetRef.current?.close()}
              />
            )}
          </View>
        </View>
      </BottomSheetPortal>
    </BottomSheet>
  );
});
