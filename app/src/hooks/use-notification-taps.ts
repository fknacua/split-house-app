import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { actionRequestFromData, setPendingTapRequest, tapRequestFromData } from '@/lib/notifications';

/** How long after navigating to Home the tap's target is handed over. */
const HAND_OVER_DELAY_MS = 200;

/**
 * Opens what a tapped notification points at, including a tap that launched the app from closed.
 *
 * A tap brings up the This month tab and hands its target to Home, which owns the sheets a target can open (Record
 * payment, Send message, Mark bill paid) and opens screens through the same code as its own buttons. A tap
 * before the app is ready (signed out, First run not finished) waits and is handled once it is; a response is cleared
 * once handled so it never opens twice. The body and the Paid and Nudge buttons (14.4) count; any other action is ignored.
 *
 * @param live - True once the user is signed in, First run is finished and the bootstrap has loaded.
 */
export function useNotificationTaps(live: boolean): void {
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!live || !response) return;
    const data = response.notification.request.content.data;
    const request =
      response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
        ? tapRequestFromData(data)
        : actionRequestFromData(data, response.actionIdentifier);
    if (request) {
      router.navigate('/');
      // After the navigation has settled: a target opened first (a pushed screen) would be popped by it.
      setTimeout(() => setPendingTapRequest(request), HAND_OVER_DELAY_MS);
    }
    Notifications.clearLastNotificationResponse();
    // No cleanup: the response is cleared above, so this effect re-runs without it and must not cancel the hand-over.
  }, [live, response]);
}
