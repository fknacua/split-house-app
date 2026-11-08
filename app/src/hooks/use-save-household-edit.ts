import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib';
import type { HouseholdEdit, HouseholdEditSaveResponse } from '@splithouse/shared';

/**
 * Saves a Household edit (`POST /api/household/edits`). A name shows on Home, History, Recipient, View bill
 * and the payment sheets as well as Household, so all are refetched. In first setup a save also marks or changes
 * Welcome's steps, so the setup query is refetched too. The mutation stays pending until they are, so Save keeps its
 * spinner until the screens behind it are up to date.
 */
export function useSaveHouseholdEdit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (edit: HouseholdEdit) =>
      apiFetch<HouseholdEditSaveResponse>('/api/household/edits', { method: 'POST', body: edit }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.allHousehold }),
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.history }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allRecipients }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allBills }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allChargePayments }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allPaymentOptions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.setup }),
      ]),
  });
}
