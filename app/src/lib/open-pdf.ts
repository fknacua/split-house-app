import { File, Paths } from 'expo-file-system';
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
 * Writes a PDF to the app's cache folder and opens it in the phone's PDF viewer (Android's
 * "open with" chooser when there is more than one). The same name is overwritten next time, so
 * the cache holds one copy per name.
 *
 * @param bytes The PDF.
 * @param name The cache file's name, e.g. `bill-2026-11.pdf`.
 * @returns When the user comes back from the viewer.
 * @throws {NoPdfViewerError} When no app can open PDFs.
 */
export async function openPdf(bytes: Uint8Array, name: string): Promise<void> {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(bytes);
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
