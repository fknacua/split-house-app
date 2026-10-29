/**
 * The utility bill line items View bill shows, in display order. The parser only reads
 * lines whose label is in this list; everything else on the bill is ignored.
 */
export const UTIL_BILL_LINE_LABELS = ['Electricity', 'Gas', 'Water'] as const;

/**
 * The largest bill PDF the backend accepts, in bytes (4 MB). Vercel rejects request bodies over
 * 4.5 MB before the route runs, so the limit sits below that. The app checks it before uploading.
 */
export const MAX_BILL_PDF_BYTES = 4 * 1024 * 1024;

/**
 * Writes the small line under a bill's file name.
 *
 * @param sizeBytes The file's size in bytes.
 * @param pageCount The PDF's page count, or `null` when it could not be read.
 * @returns e.g. `2 pages · 214 KB`, `1 page · 1.2 MB`, or `214 KB` with no page count.
 */
export function formatBillFileMeta(sizeBytes: number, pageCount: number | null): string {
  const size =
    sizeBytes >= 1024 * 1024
      ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  if (pageCount === null) return size;
  return `${pageCount} ${pageCount === 1 ? 'page' : 'pages'} · ${size}`;
}
