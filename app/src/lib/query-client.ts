import { QueryClient } from '@tanstack/react-query';

import { ServerUnreachableError } from '@/lib/api';

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
  defaultOptions: {
    queries: {
      retry: shouldRetryRead,
      retryDelay: readRetryDelay,
      staleTime: STALE_TIME_MS,
    },
    mutations: { retry: false },
  },
});
