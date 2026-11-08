import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { SetupSkippableStep } from '@splithouse/shared';
import type { OpenSetupTarget } from './types';

/** What Welcome runs for the targets that call the server instead of opening a page. */
export interface SetupTargetActions {
  /** `Not now` in `optional`: skips the optional step, and Welcome moves to the next. */
  onSkip: (step: SetupSkippableStep) => void;
  /** `Finish setup` in `allDone`: finishes First run; the session gate then swaps Welcome for Home. */
  onFinish: () => void;
}

/**
 * Opens a Welcome target. Start month, People and Custom messages open their pages; Rent & rooms and Household splits
 * open their Household editors, which answer in first-setup mode. Each goes back to Welcome on save or Back.
 *
 * @param actions - What to run for `skip-step` and `finish`.
 * @returns The handler rows and footer buttons call with their target.
 */
export function useOpenSetupTarget({ onSkip, onFinish }: SetupTargetActions): OpenSetupTarget {
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
        case 'skip-step':
          onSkip(target.step);
          return;
        case 'finish':
          onFinish();
          return;
      }
    },
    [router, onSkip, onFinish],
  );
}
