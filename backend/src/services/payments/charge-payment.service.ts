import { parseHouseholdConfig, todayKey, type ChargePaymentResponse } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { now } from "@/lib/now";
import { buildPaymentSheet, type PaymentSheetChargeRow } from "@/lib/payments/build-payment-sheet";

const CHARGE_SELECT = {
  id: true,
  month: true,
  category: true,
  label: true,
  amountCents: true,
  dueDate: true,
  payViaPersonId: true,
  paidCents: true,
  paidOn: true,
  person: { select: { name: true } },
  householdVersion: { select: { schemaVersion: true, config: true } },
} as const;

/** The charge row this service reads: the sheet's fields plus the version pinned to it. */
type ChargePaymentRow = PaymentSheetChargeRow & { householdVersion: { schemaVersion: number; config: unknown } };

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface ChargePaymentDb {
  charge: {
    findUnique(args: { where: { id: string }; select: typeof CHARGE_SELECT }): Promise<ChargePaymentRow | null>;
  };
}

/**
 * Reads one charge with its person and pinned household version, and hands it to
 * `buildPaymentSheet`. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param chargeId - The charge's id.
 * @returns The Mark paid sheet for that charge.
 * @throws {ApiError} 404 `no_charge` for an unknown charge, 409 `nothing_to_pay` for a charge of
 * zero or less (a credit), which has nothing to receive.
 */
export async function getChargePayment(db: ChargePaymentDb, chargeId: string): Promise<ChargePaymentResponse> {
  const charge = await db.charge.findUnique({ where: { id: chargeId }, select: CHARGE_SELECT });
  if (!charge) throw new ApiError(404, "no_charge", "This charge doesn’t exist.");
  if (charge.amountCents <= 0) throw new ApiError(409, "nothing_to_pay", "This charge has nothing to pay.");
  const { householdVersion, ...row } = charge;
  return buildPaymentSheet({
    today: todayKey(now()),
    config: parseHouseholdConfig(householdVersion.schemaVersion, householdVersion.config),
    charge: row,
  });
}
