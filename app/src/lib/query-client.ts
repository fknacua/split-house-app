import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiRequestError, ServerUnreachableError } from '@/lib/api';
import { reportServerUnreachable } from '@/lib/server-unreachable';
import { endSession } from '@/lib/session';

/**
 * A 401 from the backend means the session ended: send the user back to Sign in. An unreachable
 * server raises the blocking "Can't reach the server" prompt.
 */
function handleError(error: Error) {
  if (error instanceof ApiRequestError && error.status === 401) void endSession();
  if (error instanceof ServerUnreachableError) reportServerUnreachable();
}

/** Extra attempts after a read fails with {@link ServerUnreachableError} (3 attempts in all). */
const READ_RETRIES = 2;

/** Data counts as fresh for this long, so remounting a screen does not refetch at once. */
const STALE_TIME_MS = 30_000;

/**
 * Whether a failed read should be tried again. Only unreachable-server errors
 * are retried (they cover a Neon cold start); a 401 or a validation error
 * would fail the same way, so it surfaces straight away.
 *
 * @param failureCount Failures so far, starting at 0 for the first retry.
 * @param error The error the query function threw.
 */
export function shouldRetryRead(failureCount: number, error: Error): boolean {
  return error instanceof ServerUnreachableError && failureCount < READ_RETRIES;
}

/** Waits about 1s, then 2s, between read retries. */
export function readRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 4000);
}

/**
 * The app's single query client. Reads retry per {@link shouldRetryRead};
 * mutations never retry, so the user re-taps after a failure.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleError }),
  mutationCache: new MutationCache({ onError: handleError }),
  defaultOptions: {
    queries: {
      retry: shouldRetryRead,
      retryDelay: readRetryDelay,
      staleTime: STALE_TIME_MS,
    },
    mutations: { retry: false },
  },
});
