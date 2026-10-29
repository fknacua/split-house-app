import type { BillFileStore, StoredBillFile } from "@/lib/bill/bill-file-store";

const FILE_SELECT = { filename: true, mimeType: true, sizeBytes: true, pageCount: true, bytes: true } as const;

/** The slice of the Prisma client (or a transaction) the Postgres file store uses. */
export interface BillFileDb {
  billFile: {
    create(args: { data: StoredBillFile & { billId: string } }): Promise<unknown>;
    findUnique(args: { where: { billId: string }; select: typeof FILE_SELECT }): Promise<StoredBillFile | null>;
    deleteMany(args: { where: { billId: string } }): Promise<unknown>;
  };
}

/**
 * The v1 {@link BillFileStore}: the bytes live in the `BillFile` table. Pass a transaction client
 * to save a bill and its file together.
 *
 * @param db The Prisma client or a transaction client.
 * @returns A file store backed by that client.
 */
export function postgresBillFileStore(db: BillFileDb): BillFileStore {
  return {
    async save(billId, file) {
      await db.billFile.create({ data: { billId, ...file } });
    },
    get: (billId) => db.billFile.findUnique({ where: { billId }, select: FILE_SELECT }),
    async delete(billId) {
      await db.billFile.deleteMany({ where: { billId } });
    },
  };
}
