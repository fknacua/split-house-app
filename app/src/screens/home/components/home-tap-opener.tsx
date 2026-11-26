import { useEffect } from 'react';

import { subscribePendingTapRequest, takePendingTapRequest } from '@/lib/notifications';
import { useOpenTarget } from '../use-open-target';

/**
 * Opens the target of a tapped notification (`useNotificationTaps` hands it over), waiting or already there. Renders
 * nothing; it sits inside Home's sheets so a target can open a sheet.
 */
export function HomeTapOpener() {
  const { openTarget } = useOpenTarget();

  useEffect(() => {
    const open = () => {
      const request = takePendingTapRequest();
      if (request?.target) openTarget(request.target);
    };
    open();
    return subscribePendingTapRequest(open);
  }, [openTarget]);

  return null;
}
