import { useCallback, useState } from 'react';

/**
 * State for a pull-down refresh on a list screen. Tracks its own `refreshing` flag instead of
 * the query's `isRefetching`, so a background refetch (focus, invalidation) does not make the
 * pull-down spinner appear on its own.
 *
 * @param refetch - Refetches the screen's query, such as `refetch` from `useHome`.
 * @returns `refreshing` and `onRefresh` for `RefreshControl`.
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return { refreshing, onRefresh };
}
