import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { OpenSetupTarget } from './types';

/**
 * Opens a Welcome target. Start month opens its page; Rent & rooms and Household splits open their
 * Household editors, which answer in first-setup mode. Each goes back to Welcome on save or Back.
 * The rest do nothing until their screens exist: People (11.6), Custom messages (11.8) and finishing (11.9).
 *
 * @returns The handler rows and footer buttons call with their target.
 */
export function useOpenSetupTarget(): OpenSetupTarget {
  const router = useRouter();
  return useCallback(
    (target) => {
      switch (target.kind) {
        case 'start-month':
          router.push('/setup/start-month');
          return;
        case 'edit-home':
          router.push('/household/landlord-rooms');
          return;
        case 'edit-splits':
          router.push('/household/split');
          return;
        case 'setup-people':
        case 'setup-messages':
        case 'finish':
          return;
      }
    },
    [router],
  );
}
