import { useMutation } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import type { BillDraftResponse } from '@splithouse/shared';

/** A PDF picked on the phone, ready to upload. */
export interface PickedPdf {
  /** The local `file://` or `content://` uri the picker returned. */
  uri: string;
  /** The file's own name, e.g. `Utilities_Bill_Nov2026.pdf`. */
  name: string;
}

/**
 * Uploads a picked bill PDF as the month's draft (`POST /api/months/:month/bill-draft`) and
 * returns what the server read from it. Nothing is cached: the draft is the screen's own state
 * until it is saved.
 *
 * @param month `YYYY-MM`, the month the upload started from.
 */
export function useUploadBillDraft(month: string) {
  return useMutation({
    mutationFn: (file: PickedPdf) => {
      const formData = new FormData();
      // React Native's FormData sends a `{ uri, name, type }` part as the file's bytes.
      formData.append('file', { uri: file.uri, name: file.name, type: 'application/pdf' } as unknown as Blob);
      return apiFetch<BillDraftResponse>(`/api/months/${month}/bill-draft`, { method: 'POST', formData });
    },
  });
}
