import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';

/**
 * Asks before a form with unsaved changes is left. Covers the header's Back, a Cancel button and the
 * Android back gesture; draw the question with `ConfirmDialog` from what this returns.
 *
 * @param options.dirty Whether the form has unsaved changes.
 * @param options.busy True while saving: leaving is ignored.
 * @param options.leave Leaves the form.
 * @returns `asking`, whether to show the dialog; `requestLeave`, for Back and Cancel; `keepEditing` and
 *   `discard`, the dialog's two buttons.
 */
export function useUnsavedGuard({ dirty, busy, leave }: { dirty: boolean; busy: boolean; leave: () => void }) {
  const [asking, setAsking] = useState(false);

  const requestLeave = () => {
    if (busy) return;
    if (dirty) setAsking(true);
    else leave();
  };

  // The back gesture runs the latest requestLeave, so the listener is added once per focus.
  const requestLeaveRef = useRef(requestLeave);
  useEffect(() => {
    requestLeaveRef.current = requestLeave;
  });
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        requestLeaveRef.current();
        return true;
      });
      return () => subscription.remove();
    }, []),
  );

  return {
    asking,
    requestLeave,
    keepEditing: () => setAsking(false),
    discard: () => {
      setAsking(false);
      leave();
    },
  };
}
