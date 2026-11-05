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
  /** Every month's View bill. The prefix of `bill`, so a rename refreshes them all. */
  allBills: ['bill'] as const,
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
  /** Every Mark paid sheet. The prefix of `chargePayment`, so a rename refreshes them all. */
  allChargePayments: ['charge-payment'] as const,
  /** @param chargeId The charge whose Mark paid sheet this is. */
  chargePayment: (chargeId: string) => ['charge-payment', chargeId] as const,
  /** Every month's Record payment lists. The prefix of `paymentOptions`, so a payment refreshes them all. */
  allPaymentOptions: ['payment-options'] as const,
  /** @param month `YYYY-MM` key of the month Record payment is opened for. */
  paymentOptions: (month: string) => ['payment-options', month] as const,
  /** Every Recipient screen. The prefix of `recipient`, so a payment refreshes whichever is open. */
  allRecipients: ['recipient'] as const,
  /**
   * @param month `YYYY-MM` key of the month the Recipient screen shows.
   * @param personId The person it is for.
   * @param chargeId The overdue charge Home's Nudge chose, or null.
   */
  recipient: (month: string, personId: string, chargeId: string | null) =>
    ['recipient', month, personId, chargeId] as const,
  /** Every month of the Household screen. The prefix of `household`, so an edit refreshes them all. */
  allHousehold: ['household'] as const,
  /** @param month `YYYY-MM` key of the month picked in "Showing:", or null for the active month. */
  household: (month: string | null) => ['household', month] as const,
  /**
   * One person's Edit and View screens. Under `allHousehold`, so an edit refreshes them too.
   * @param personId The person.
   */
  householdForm: (personId: string) => ['household', 'form', personId] as const,
  /** The Add subtenant screen. Under `allHousehold`, so an edit refreshes it too. */
  householdAddForm: ['household', 'add-form'] as const,
  /** The Landlord & rooms screen. Under `allHousehold`, so an edit refreshes it too. */
  householdHomeForm: ['household', 'home-form'] as const,
  /** The Household split screen. Under `allHousehold`, so an edit refreshes it too. */
  householdSplitForm: ['household', 'split-form'] as const,
  /** The Settings screen. Under `allHousehold`, since its Messages rows count the saved templates and an edit can change them. */
  settings: ['household', 'settings'] as const,
  /**
   * What a Household edit would change, by the edit sent.
   * @param edit The edit sent to the preview.
   */
  householdEditPreview: (edit: unknown) => ['household-edit-preview', edit] as const,
};
