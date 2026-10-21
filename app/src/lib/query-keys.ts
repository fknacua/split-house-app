/**
 * Central query keys. Mutations invalidate by these keys, so build every key
 * here and never inline one.
 *
 * Mutation pattern: call `queryClient.invalidateQueries` in `onSuccess` and
 * return its promise, so the mutation (and a sheet's "saving" state) stays
 * pending until the refetch finishes.
 */
export const queryKeys = {
  me: ['me'] as const,
  /** @param month `YYYY-MM` key. */
  monthSummary: (month: string) => ['month-summary', month] as const,
};
