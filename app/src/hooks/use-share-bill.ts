import { useMutation } from '@tanstack/react-query';
import { shareAsync } from 'expo-sharing';
import { Share } from 'react-native';

import { downloadBillPdf } from '@/lib/bill-pdf';

/** What Share bill sends: the stored PDF under its own name, or the summary text. */
export type ShareBillRequest = { kind: 'pdf'; filename: string } | { kind: 'summary'; text: string };

/** The stored name without path separators, so it is a plain name in the cache folder. */
function cacheName(filename: string): string {
  return filename.replace(/[\\/]/g, '_');
}

/**
 * Share bill's "Choose where to send": downloads the PDF to the cache folder under its stored name
 * and hands it to Android's share sheet (`expo-sharing`), or shares the summary as plain text
 * (`Share.share`). Stays pending until the share sheet closes. Nothing is recorded. An
 * unreachable server raises the app's prompt; any other failure is the mutation's error.
 *
 * @param month `YYYY-MM` key of the bill's month.
 */
export function useShareBill(month: string) {
  return useMutation({
    mutationFn: async (request: ShareBillRequest) => {
      if (request.kind === 'summary') {
        await Share.share({ message: request.text });
        return;
      }
      const file = await downloadBillPdf(month, cacheName(request.filename));
      await shareAsync(file.uri, { mimeType: 'application/pdf' });
    },
  });
}
