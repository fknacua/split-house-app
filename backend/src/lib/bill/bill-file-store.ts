/** A bill's stored PDF. */
export interface StoredBillFile {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  bytes: Uint8Array<ArrayBuffer>;
}

/**
 * Where a saved bill's PDF is kept, one file per bill. v1 keeps the bytes in Postgres
 * (`BillFile`); the interface lets a later version move them to object storage without
 * touching the services that save or read a bill.
 */
export interface BillFileStore {
  /** Stores the file for a bill. A bill has at most one file. */
  save(billId: string, file: StoredBillFile): Promise<void>;
  /** The bill's file, or `null` when it has none. */
  get(billId: string): Promise<StoredBillFile | null>;
  /** Removes the bill's file; does nothing when it has none. */
  delete(billId: string): Promise<void>;
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

/**
 * Checks a file's first bytes for the PDF signature, so the file name or the type the phone
 * reports are never trusted.
 *
 * @param bytes The whole file, or at least its first 5 bytes.
 * @returns `true` when the file starts with `%PDF-`.
 */
export function isPdf(bytes: Uint8Array): boolean {
  return PDF_MAGIC.every((byte, i) => bytes[i] === byte);
}
