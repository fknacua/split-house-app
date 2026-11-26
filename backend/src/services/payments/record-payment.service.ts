import {
  parseHouseholdConfig,
  todayKey,
  type RecordPaymentPreviewRequest,
  type RecordPaymentQuery,
  type RecordPaymentSheet,
} from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { now } from "@/lib/now";
import {
  buildRecordPayment,
  payablesByPayer,
  type RecordPaymentCharge,
  type RecordPaymentInput,
  type RecordPaymentPerson,
} from "@/lib/payments/build-record-payment";
import { getActiveMonth, type ActiveMonthDb } from "@/services/months/active-month.service";

const CHARGE_SELECT = {
  id: true,
  personId: true,
  month: true,
  category: true,
  label: true,
  amountCents: true,
  dueDate: true,
  payViaPersonId: true,
  paidCents: true,
  correctsCharge: { select: { label: true, month: true } },
  householdVersion: { select: { schemaVersion: true, config: true } },
} as const;

const PERSON_SELECT = { id: true, name: true, isOwner: true } as const;

/** Only unpaid charges above zero in the month or earlier: the rest have nothing to record. */
interface UnpaidChargesWhere {
  month: { lte: string };
  paidCents: null;
  amountCents: { gt: 0 };
}

/** The charge row this service reads: the builder's fields plus the version pinned to it. */
type UnpaidChargeRow = Omit<RecordPaymentCharge, "config"> & {
  householdVersion: { schemaVersion: number; config: unknown };
};

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface RecordPaymentSheetDb extends ActiveMonthDb {
  month: ActiveMonthDb["month"] & {
    findUnique(args: { where: { month: string }; select: { month: true } }): Promise<{ month: string } | null>;
  };
  person: {
    findMany(args: { select: typeof PERSON_SELECT }): Promise<RecordPaymentPerson[]>;
  };
  charge: {
    findMany(args: { where: UnpaidChargesWhere; select: typeof CHARGE_SELECT }): Promise<UnpaidChargeRow[]>;
    findUnique(args: {
      where: { id: string };
      select: { paidCents: true };
    }): Promise<{ paidCents: number | null } | null>;
  };
}

/**
 * Reads the active month, the people and every unpaid charge in the active month and earlier, each
 * with its pinned household version: what `buildRecordPayment` reads. Read-only.
 *
 * @throws {ApiError} 404 `no_month` when the active month is not open.
 */
async function loadInput(db: RecordPaymentSheetDb): Promise<RecordPaymentInput> {
  const month = await getActiveMonth(db);
  const [opened, people, charges] = await Promise.all([
    db.month.findUnique({ where: { month }, select: { month: true } }),
    db.person.findMany({ select: PERSON_SELECT }),
    db.charge.findMany({
      where: { month: { lte: month }, paidCents: null, amountCents: { gt: 0 } },
      select: CHARGE_SELECT,
    }),
  ]);
  if (!opened) throw new ApiError(404, "no_month", "This month isn’t open.");
  return {
    month,
    today: todayKey(now()),
    people,
    charges: charges.map(({ householdVersion, ...row }) => ({
      ...row,
      config: parseHouseholdConfig(householdVersion.schemaVersion, householdVersion.config),
    })),
  };
}

/** @throws {ApiError} 404 `no_person` when the person isn't in the From list. */
function assertInFromList(byPayer: Map<string, unknown>, personId: string): void {
  if (!byPayer.has(personId)) throw new ApiError(404, "no_person", "That person has nothing to pay.");
}

/** Who pays the charge, when it is in someone's For list; null otherwise. */
function payerIn(byPayer: Map<string, { charge: { id: string } }[]>, chargeId: string): string | null {
  for (const [payerId, payables] of byPayer) {
    if (payables.some((p) => p.charge.id === chargeId)) return payerId;
  }
  return null;
}

/**
 * Finds who pays a charge opened from Mark paid, or says why it can't be recorded.
 *
 * @returns The payer's id.
 * @throws {ApiError} 404 `no_charge` for an unknown charge, 409 `already_paid` for a paid one, 409
 * `nothing_to_pay` for one with nothing to record (a credit, or the owner's own charge).
 */
async function payerOfCharge(
  db: RecordPaymentSheetDb,
  byPayer: Map<string, { charge: { id: string } }[]>,
  chargeId: string,
): Promise<string> {
  const payerId = payerIn(byPayer, chargeId);
  if (payerId !== null) return payerId;
  const charge = await db.charge.findUnique({ where: { id: chargeId }, select: { paidCents: true } });
  if (!charge) throw new ApiError(404, "no_charge", "This charge doesn’t exist.");
  if (charge.paidCents !== null) throw new ApiError(409, "already_paid", "This charge is already paid.");
  throw new ApiError(409, "nothing_to_pay", "This charge has nothing to pay.");
}

/**
 * The Record payment sheet for the active month, as it opens: with nobody picked, with a person
 * picked and nothing ticked, or from Mark paid or a reminder's Paid with the charges' payer picked
 * and the charges ticked.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param query - Who is picked and the charges opened on; both optional. The payer is the first
 * still-payable charge's; ids not in that payer's For list (paid since, or someone else's) are left
 * out, so a reminder tapped after part of it was paid still opens.
 * @returns The sheet.
 * @throws {ApiError} 404 `no_month` when the active month is not open; 404 `no_person` when the
 * person isn't in the From list; 404 `no_charge`, 409 `already_paid` or 409 `nothing_to_pay` when no
 * charge given can be recorded (the first one's reason); 409 `not_their_charge` when the charges are
 * paid by someone other than the person given with them.
 */
export async function getRecordPaymentSheet(db: RecordPaymentSheetDb, query: RecordPaymentQuery): Promise<RecordPaymentSheet> {
  const input = await loadInput(db);
  const byPayer = payablesByPayer(input);
  if (query.personId) assertInFromList(byPayer, query.personId);
  if (!query.chargeIds) return buildRecordPayment(input, { personId: query.personId ?? null, ticked: [] });

  const firstPayer = query.chargeIds.map((id) => payerIn(byPayer, id)).find((id) => id !== null);
  const payerId = firstPayer ?? (await payerOfCharge(db, byPayer, query.chargeIds[0]));
  if (query.personId && query.personId !== payerId) {
    throw new ApiError(409, "not_their_charge", "That charge isn’t paid by this person.");
  }
  const theirs = new Set((byPayer.get(payerId) ?? []).map((p) => p.charge.id));
  return buildRecordPayment(input, { personId: payerId, ticked: query.chargeIds.filter((id) => theirs.has(id)) });
}

/**
 * The sheet again with a changed person or set of ticked charges. Nothing is stored.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param values - Who is picked and the ticked charge ids. Ids that are not in the person's For list
 * are left out.
 * @returns The sheet.
 * @throws {ApiError} 404 `no_month` or `no_person`, as `getRecordPaymentSheet`.
 */
export async function previewRecordPayment(
  db: RecordPaymentSheetDb,
  values: RecordPaymentPreviewRequest,
): Promise<RecordPaymentSheet> {
  const input = await loadInput(db);
  assertInFromList(payablesByPayer(input), values.personId);
  return buildRecordPayment(input, { personId: values.personId, ticked: values.chargeIds });
}
