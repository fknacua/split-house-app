import type { StoredBillFile } from "@/lib/bill/bill-file-store";
import { ApiError } from "@/lib/api";
import { postgresBillFileStore, type BillFileDb } from "./bill-file-store.service";

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface BillFileReadDb extends BillFileDb {
  bill: {
    findUnique(args: { where: { month: string }; select: { id: true } }): Promise<{ id: string } | null>;
  };
}

/**
 * Reads the month's saved bill PDF, for View bill's Open.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param month - The month key, e.g. `2026-11`.
 * @returns The stored file, bytes included.
 * @throws {ApiError} 404 `no_bill` when the month has no saved bill, 404 `no_file` when the bill has no file.
 */
export async function getBillFile(db: BillFileReadDb, month: string): Promise<StoredBillFile> {
  const bill = await db.bill.findUnique({ where: { month }, select: { id: true } });
  if (!bill) throw new ApiError(404, "no_bill", "This month has no saved bill.");
  const file = await postgresBillFileStore(db).get(bill.id);
  if (!file) throw new ApiError(404, "no_file", "This bill has no PDF.");
  return file;
}
