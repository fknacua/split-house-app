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
  bootstrap: ['bootstrap'] as const,
  /** Home: the newest opened month. The server picks the month, so there is no month in the key. */
  home: ['home'] as const,
  /** The History list. Also the prefix of every `historyMonth` key, so invalidating it refreshes both. */
  history: ['history'] as const,
  /** @param month `YYYY-MM` key. */
  historyMonth: (month: string) => ['history', month] as const,
  /** @param month `YYYY-MM` key of the month View bill shows. */
  bill: (month: string) => ['bill', month] as const,
  /** The mutation key of Home's Discard (the bill draft), so every Continue on Home can see that it is running. */
  billDraftDiscard: ['bill-draft-discard'] as const,
  /** @param month `YYYY-MM` key of the month whose stored bill draft Continue opens. */
  billDraft: (month: string) => ['bill-draft', month] as const,
  /**
   * The server's checks of the Review bill form, by the values checked.
   * @param month `YYYY-MM` key of the upload.
   * @param request The values sent to the check.
   */
  billCheck: (month: string, request: unknown) => ['bill-check', month, request] as const,
  /** @param chargeId The charge whose Mark paid sheet this is. */
  chargePayment: (chargeId: string) => ['charge-payment', chargeId] as const,
};
