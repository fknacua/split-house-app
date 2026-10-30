import type { File } from 'expo-file-system';
import { startActivityAsync } from 'expo-intent-launcher';

/** Android's `Intent.ACTION_VIEW`. */
const ACTION_VIEW = 'android.intent.action.VIEW';

/** Android's `Intent.FLAG_GRANT_READ_URI_PERMISSION`: lets the viewer read our content URI. */
const FLAG_GRANT_READ_URI_PERMISSION = 1;

/** No app on the phone can open a PDF. */
export class NoPdfViewerError extends Error {
  constructor() {
    super('No app can open PDFs.');
    this.name = 'NoPdfViewerError';
  }
}

/**
 * Opens a PDF from the app's cache folder in the phone's PDF viewer (Android's "open with"
 * chooser when there is more than one).
 *
 * @param file The PDF, e.g. from `downloadBillPdf`.
 * @returns When the user comes back from the viewer.
 * @throws {NoPdfViewerError} When no app can open PDFs.
 */
export async function openPdf(file: File): Promise<void> {
  try {
    await startActivityAsync(ACTION_VIEW, {
      data: file.contentUri,
      type: 'application/pdf',
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
  } catch (error) {
    // Android throws ActivityNotFoundException ("No Activity found to handle Intent").
    if (error instanceof Error && /No Activity found|ActivityNotFound/i.test(error.message)) {
      throw new NoPdfViewerError();
    }
    throw error;
  }
}
