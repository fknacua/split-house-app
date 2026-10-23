import type { PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { ServerErrorDialog } from '@/components/server-error-dialog';
import { ServerUnreachableError } from '@/lib/api';
import { retryServerConnection, useServerUnreachable } from '@/lib/server-unreachable';

/**
 * Shows the blocking "Can't reach the server" prompt over the whole app whenever a query or
 * mutation fails with `ServerUnreachableError` (the query client raises it). Retry refetches the
 * queries that failed that way and closes the prompt if they all succeed. Mutations are not
 * replayed: after a failed save the user taps Save again. Mount it inside `QueryClientProvider`
 * and the gluestack provider, around the screens.
 */
export function ServerUnreachableProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { open, retrying } = useServerUnreachable();

  const retry = () =>
    retryServerConnection(() =>
      queryClient.refetchQueries({
        predicate: (query) => query.state.error instanceof ServerUnreachableError,
      }),
    );

  return (
    <>
      {children}
      <ServerErrorDialog open={open} retrying={retrying} onRetry={retry} />
    </>
  );
}
