import type { DeleteCorrectionResponse } from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api";
import { beginSettledCheck, type SettledEventsTx } from "@/services/notifications/notification-events.service";

const CHARGE_SELECT = { id: true, month: true, category: true, correctsMonth: true } as const;

/** The transaction client's slice this service uses, so tests can pass an in-memory fake. */
export interface DeleteCorrectionTx extends SettledEventsTx {
  charge: SettledEventsTx["charge"] & {
    findUnique(args: { where: { id: string }; select: typeof CHARGE_SELECT }): Promise<{
      id: string;
      month: string;
      category: ChargeCategory;
      correctsMonth: string | null;
    } | null>;
    delete(args: { where: { id: string }; select: { id: true } }): Promise<{ id: string }>;
  };
}

/** The Prisma client, or a fake in tests. */
export interface DeleteCorrectionDb {
  $transaction<T>(fn: (tx: DeleteCorrectionTx) => Promise<T>): Promise<T>;
}

/**
 * Deletes a correction, its payment with it, so it leaves Home, History, the original's Activity and the corrected
 * month's banner. A nudge already sent about it stays stored, no longer linked to a charge. Only corrections can be
 * deleted: every other charge is fixed with Edit payment or a correction. Deleting an unpaid one can settle the month
 * that held it, which records its settled FYI in the same transaction.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param chargeId - The correction's id.
 * @returns The correction's id, the month that held it and the month it fixed, for the app to refetch.
 * @throws {ApiError} 404 `no_charge` for an unknown charge (also one already deleted, so a Retry after a lost
 * response reads as done); 409 `not_correction` for any other charge.
 */
export async function deleteCorrection(db: DeleteCorrectionDb, chargeId: string): Promise<DeleteCorrectionResponse> {
  return db.$transaction(async (tx) => {
    const charge = await tx.charge.findUnique({ where: { id: chargeId }, select: CHARGE_SELECT });
    if (!charge) throw new ApiError(404, "no_charge", "This charge doesn’t exist.");
    if (charge.category !== "CORRECTION" || charge.correctsMonth === null) {
      throw new ApiError(409, "not_correction", "Only a correction can be deleted.");
    }
    const settled = await beginSettledCheck(tx, [charge.month]);
    await tx.charge.delete({ where: { id: chargeId }, select: { id: true } });
    await settled.finish();
    return { chargeId, month: charge.month, correctsMonth: charge.correctsMonth };
  });
}
