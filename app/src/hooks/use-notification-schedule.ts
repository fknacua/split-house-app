import { useEffect, useRef, useState } from 'react';

import { askForNotificationsIfNeverAsked, rebuildNotificationSchedule } from '@/lib/notifications';
import { queryClient } from '@/lib/query-client';

/** A burst of writes (a sheet saving and refetching) rebuilds once, this long after the last. */
const REBUILD_DELAY_MS = 500;

const ignore = () => {};

/**
 * Keeps the phone's reminders in step with the server.
 *
 * - Signing in to a household that is already set up shows the Returning screen's `reminders` step while it sets
 *   them up, asking for the permission on a phone where it was never asked (a new phone or a reinstall).
 * - Launching with a stored session rebuilds them in the background, as does finishing First run, which has its own
 *   Reminders step.
 * - From then on every successful write rebuilds them, which covers a toggle change too.
 *
 * Nothing runs until First run has finished, since there is nothing to remind about before.
 *
 * @param input.pending - True while the first session lookup runs.
 * @param input.signedIn - Whether there is a session.
 * @param input.loaded - Whether the bootstrap has loaded.
 * @param input.setupComplete - The bootstrap's `setupComplete`.
 * @returns True while the Returning screen's `reminders` step should show.
 */
export function useNotificationSchedule({
  pending,
  signedIn,
  loaded,
  setupComplete,
}: {
  pending: boolean;
  signedIn: boolean;
  loaded: boolean;
  setupComplete: boolean;
}): boolean {
  // Signed in during this run (Sign in was on screen) to a household already set up: the Returning case.
  const [signedOutSeen, setSignedOutSeen] = useState(false);
  const [returning, setReturning] = useState<boolean | null>(null);
  const [setUp, setSetUp] = useState(false);
  const justSetUp = useRef(false);

  if (!pending && !signedIn) {
    if (!signedOutSeen) setSignedOutSeen(true);
    if (returning !== null) setReturning(null);
    if (setUp) setSetUp(false);
  }
  if (signedIn && loaded && returning === null) setReturning(signedOutSeen && setupComplete);

  const settingUp = returning === true && !setUp;
  const live = signedIn && loaded && setupComplete && !settingUp;

  useEffect(() => {
    if (!settingUp) return;
    let active = true;
    void (async () => {
      try {
        await askForNotificationsIfNeverAsked();
        await rebuildNotificationSchedule();
      } catch {
        // A failed rebuild keeps what was scheduled; the next write or launch tries again.
      } finally {
        if (active) {
          justSetUp.current = true;
          setSetUp(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [settingUp]);

  useEffect(() => {
    if (!live) return;
    if (!justSetUp.current) void rebuildNotificationSchedule().catch(ignore);
    justSetUp.current = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'success') return;
      clearTimeout(timer);
      timer = setTimeout(() => void rebuildNotificationSchedule().catch(ignore), REBUILD_DELAY_MS);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [live]);

  return settingUp;
}
