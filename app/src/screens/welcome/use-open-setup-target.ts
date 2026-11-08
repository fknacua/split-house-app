import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { OpenSetupTarget } from './types';

/**
 * Opens a Welcome target. Start month, People and Custom messages open their pages; Rent & rooms and Household splits
 * open their Household editors, which answer in first-setup mode. Each goes back to Welcome on save or Back.
 * The finish target calls `onFinish`, which finishes First run; the session gate then swaps Welcome for Home.
 *
 * @param onFinish - Called for `Not now` and `Finish setup`.
 * @returns The handler rows and footer buttons call with their target.
 */
export function useOpenSetupTarget(onFinish: () => void): OpenSetupTarget {
  const router = useRouter();
  return useCallback(
    (target) => {
      switch (target.kind) {
        case 'start-month':
          router.push('/setup/start-month');
          return;
        case 'setup-people':
          router.push('/setup/people');
          return;
        case 'edit-home':
          router.push('/household/landlord-rooms');
          return;
        case 'edit-splits':
          router.push('/household/split');
          return;
        case 'setup-messages':
          router.push('/setup/messages');
          return;
        case 'finish':
          onFinish();
          return;
      }
    },
    [router, onFinish],
  );
}
