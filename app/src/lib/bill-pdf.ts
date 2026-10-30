import { File, Paths } from 'expo-file-system';

import { apiFetchFile } from '@/lib/api';

/**
 * Downloads the month's bill PDF (`GET /api/months/:month/bill/file`) into the app's cache
 * folder, for View bill's Open and Share bill. The same name is overwritten next time, so the
 * cache holds one copy per name.
 *
 * @param month `YYYY-MM` key.
 * @param name The cache file's name, e.g. `bill-2026-11.pdf`.
 * @returns The cached file.
 * @throws {ServerUnreachableError} When the server can't be reached.
 */
export async function downloadBillPdf(month: string, name: string): Promise<File> {
  const bytes = await apiFetchFile(`/api/months/${month}/bill/file`, 'application/pdf');
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(bytes);
  return file;
}
