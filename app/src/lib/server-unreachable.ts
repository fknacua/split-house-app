import { useSyncExternalStore } from 'react';

/** What the blocking "Can't reach the server" prompt is doing. */
export interface ServerUnreachableState {
  /** The prompt is on screen. */
  open: boolean;
  /** Retry is running: the button is disabled and shows a Spinner. */
  retrying: boolean;
}

let state: ServerUnreachableState = { open: false, retrying: false };
// Set when a failure is reported while a retry runs, so the prompt stays up after it.
let failedAgain = false;
const listeners = new Set<() => void>();

function setState(next: Partial<ServerUnreachableState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Raises the blocking prompt. Called when any query or mutation fails with
 * `ServerUnreachableError` (after reads have used their retries). Safe to call many times.
 */
export function reportServerUnreachable(): void {
  if (state.retrying) failedAgain = true;
  if (!state.open) setState({ open: true });
}

/**
 * Runs Retry: shows the retrying state, refetches the queries that failed, then closes the prompt
 * unless one of them failed again. Pending mutations are not replayed; the user taps again.
 * Does nothing while a retry is already running.
 *
 * @param refetchFailed - Refetches the failed queries. Failures it triggers reach
 *   {@link reportServerUnreachable} through the query cache; a rejection counts as a failure.
 */
export async function retryServerConnection(refetchFailed: () => Promise<void>): Promise<void> {
  if (state.retrying) return;
  failedAgain = false;
  setState({ retrying: true });
  try {
    await refetchFailed();
  } catch {
    failedAgain = true;
  } finally {
    setState({ retrying: false, open: failedAgain });
  }
}

/** The prompt's state, for the provider that renders it. */
export function useServerUnreachable(): ServerUnreachableState {
  return useSyncExternalStore(subscribe, () => state);
}

/** Puts the store back to "closed, not retrying". For tests. */
export function resetServerUnreachable(): void {
  failedAgain = false;
  state = { open: false, retrying: false };
  listeners.forEach((listener) => listener());
}

/** The current state without subscribing. For tests. */
export function getServerUnreachableState(): ServerUnreachableState {
  return state;
}
