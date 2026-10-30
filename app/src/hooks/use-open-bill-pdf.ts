import { useMutation } from '@tanstack/react-query';

import { downloadBillPdf } from '@/lib/bill-pdf';
import { openPdf } from '@/lib/open-pdf';

/**
 * View bill's Open: downloads the month's bill PDF (`GET /api/months/:month/bill/file`) to the
 * cache and opens it in the phone's PDF viewer. Stays pending until the user comes back from the
 * viewer. An unreachable server raises the app's prompt; any other failure is the mutation's error.
 *
 * @param month `YYYY-MM` key.
 */
export function useOpenBillPdf(month: string) {
  return useMutation({
    mutationFn: async () => {
      await openPdf(await downloadBillPdf(month, `bill-${month}.pdf`));
    },
  });
}
