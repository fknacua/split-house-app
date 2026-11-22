import {
  dateKeyOf,
  todayKey,
  type EditPaymentRequest,
  type EditPaymentResponse,
  type EditPaymentSheet,
} from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { buildEditPayment, isPaymentEditable, type EditPaymentCharge } from "@/lib/payments/build-edit-payment";
import { now } from "@/lib/now";

const CHARGE_SELECT = {
  id: true,
  month: true,
  personId: true,
  payViaPersonId: true,
  label: true,
  amountCents: true,
  paidCents: true,
  paidOn: true,
  paidByPersonId: true,
} as const;

const PERSON_SELECT = { id: true, name: true, isOwner: true } as const;

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface EditPaymentDb {
  charge: {
    findUnique(args: { where: { id: string }; select: typeof CHARGE_SELECT }): Promise<EditPaymentCharge | null>;
    update(args: {
      where: { id: string };
      data: { paidOn: Date } | { paidCents: null; paidOn: null; paidByPersonId: null };
      select: typeof CHARGE_SELECT;
    }): Promise<EditPaymentCharge>;
  };
  person: {
    findMany(args: { select: typeof PERSON_SELECT }): Promise<{ id: string; name: string; isOwner: boolean }[]>;
  };
}

/**
 * Reads a charge and the people, refusing an unknown charge.
 *
 * @throws {ApiError} 404 `no_charge`.
 */
async function load(db: EditPaymentDb, chargeId: string) {
  const [charge, people] = await Promise.all([
    db.charge.findUnique({ where: { id: chargeId }, select: CHARGE_SELECT }),
    db.person.findMany({ select: PERSON_SELECT }),
  ]);
  if (!charge) throw new ApiError(404, "no_charge", "This charge doesn’t exist.");
  const isOwner = people.some((p) => p.id === charge.personId && p.isOwner);
  return { charge, people, isOwner };
}

const NOT_PAID = () => new ApiError(409, "not_paid", "This charge has no payment to edit.");

/** The response for a charge after a write. */
function responseOf(charge: EditPaymentCharge): EditPaymentResponse {
  return { chargeId: charge.id, month: charge.month, paidOn: charge.paidOn ? dateKeyOf(charge.paidOn) : null };
}

/**
 * The Edit payment sheet for one paid charge. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param chargeId - The charge's id.
 * @returns The sheet, ready to render.
 * @throws {ApiError} 404 `no_charge`; 409 `not_paid` for an unpaid charge, the owner's own charge or a refund.
 */
export async function getEditPayment(db: EditPaymentDb, chargeId: string): Promise<EditPaymentSheet> {
  const { charge, people, isOwner } = await load(db, chargeId);
  if (!isPaymentEditable(charge, isOwner)) throw NOT_PAID();
  return buildEditPayment(charge, new Map(people.map((p) => [p.id, p.name])), todayKey(now()));
}

/**
 * Changes a paid charge's Received on. Nothing else about the payment changes. Saving the same day
 * again answers the same, so a Retry is safe.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param chargeId - The charge's id.
 * @param values - The new day.
 * @returns The charge, its month and the stored day.
 * @throws {ApiError} 422 `no_date` without a day; 400 `invalid_request` for a day after today; 404
 * `no_charge`; 409 `not_paid` as `getEditPayment`.
 */
export async function updatePaymentDate(
  db: EditPaymentDb,
  chargeId: string,
  values: EditPaymentRequest,
): Promise<EditPaymentResponse> {
  const { paidOn } = values;
  if (!paidOn) throw new ApiError(422, "no_date", "Enter the day it was received.");
  if (paidOn > todayKey(now())) throw new ApiError(400, "invalid_request", "Received on can’t be after today.");
  const { charge, isOwner } = await load(db, chargeId);
  if (!isPaymentEditable(charge, isOwner)) throw NOT_PAID();
  const updated = await db.charge.update({
    where: { id: chargeId },
    data: { paidOn: new Date(paidOn) },
    select: CHARGE_SELECT,
  });
  return responseOf(updated);
}

/**
 * Removes a charge's payment, so it shows as unpaid again (a settled month is no longer settled).
 * Removing it again answers the same, so a Retry after a lost response is safe.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param chargeId - The charge's id.
 * @returns The charge and its month, with `paidOn` null.
 * @throws {ApiError} 404 `no_charge`; 409 `not_paid` for the owner's own charge or a refund.
 */
export async function removePayment(db: EditPaymentDb, chargeId: string): Promise<EditPaymentResponse> {
  const { charge, isOwner } = await load(db, chargeId);
  if (charge.paidCents === null && !isOwner && charge.amountCents > 0) return responseOf(charge);
  if (!isPaymentEditable(charge, isOwner)) throw NOT_PAID();
  const updated = await db.charge.update({
    where: { id: chargeId },
    data: { paidCents: null, paidOn: null, paidByPersonId: null },
    select: CHARGE_SELECT,
  });
  return responseOf(updated);
}
