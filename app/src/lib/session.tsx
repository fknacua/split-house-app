import { useEffect, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { authClient } from '@/lib/auth-client';

let sessionEnded = false;
let ending = false;
const listeners = new Set<() => void>();

function setSessionEnded(value: boolean) {
  sessionEnded = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Handles a 401 from the backend: the session is gone (revoked, expired or the
 * database was reset). Forgets the local session so the gate routes to Sign in,
 * which then shows "Your session ended". Safe to call many times; calls while
 * one is running, or when nobody is signed in, do nothing.
 */
export async function endSession(): Promise<void> {
  if (ending) return;
  ending = true;
  try {
    setSessionEnded(true);
    // signOut clears the stored cookie before it calls the server, so a failed call still signs out locally.
    await authClient.signOut().catch(() => {});
    authClient.$store.notify('$sessionSignal');
  } finally {
    ending = false;
  }
}

/** Whether the last sign-out was forced by a 401, for the Sign in screen's `ended` state. */
export function useSessionEnded(): boolean {
  return useSyncExternalStore(subscribe, () => sessionEnded);
}

/**
 * The session gate's state, for the root layout to choose between Sign in and
 * the app. Also drops every cached query when the session goes away, so the
 * next person to sign in never sees the previous data.
 *
 * @returns `pending` only while the first session lookup runs; `signedIn` once
 *   it has answered. Later refetches (a sign-in attempt, the app regaining
 *   focus) set Better Auth's own `isPending` again while signed out, which
 *   would unmount the screens and wipe the Sign in screen's state, so it is
 *   latched.
 */
export function useSession(): { pending: boolean; signedIn: boolean } {
  const { data, isPending } = authClient.useSession();
  const queryClient = useQueryClient();
  const signedIn = Boolean(data?.session);
  const [answered, setAnswered] = useState(false);
  if (!isPending && !answered) setAnswered(true);

  useEffect(() => {
    if (isPending) return;
    if (signedIn) setSessionEnded(false);
    else queryClient.clear();
  }, [isPending, signedIn, queryClient]);

  return { pending: !answered, signedIn };
}
