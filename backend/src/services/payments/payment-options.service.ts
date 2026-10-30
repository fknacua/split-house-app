import { parseHouseholdConfig, todayKey, type PaymentOptionsResponse } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { now } from "@/lib/now";
import {
  buildPaymentOptions,
  type PaymentOptionsChargeRow,
  type PaymentOptionsPerson,
} from "@/lib/payments/build-payment-options";

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
  paidOn: true,
  person: { select: { name: true } },
  householdVersion: { select: { schemaVersion: true, config: true } },
} as const;

/** Only unpaid charges above zero in the month or earlier: the rest have nothing to record. */
interface UnpaidChargesWhere {
  month: { lte: string };
  paidCents: null;
  amountCents: { gt: 0 };
}

/** The charge row this service reads: the builder's fields plus the version pinned to it. */
type UnpaidChargeRow = Omit<PaymentOptionsChargeRow, "config"> & {
  householdVersion: { schemaVersion: number; config: unknown };
};

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface PaymentOptionsDb {
  month: {
    findUnique(args: { where: { month: string }; select: { month: true } }): Promise<{ month: string } | null>;
  };
  person: {
    findMany(args: { select: { id: true; name: true; isOwner: true } }): Promise<PaymentOptionsPerson[]>;
  };
  charge: {
    findMany(args: { where: UnpaidChargesWhere; select: typeof CHARGE_SELECT }): Promise<UnpaidChargeRow[]>;
  };
}

/**
 * Reads the people and every unpaid charge in the month and earlier months, each with its pinned
 * household version, and hands them to `buildPaymentOptions`. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param month - The month Record payment is opened for, e.g. `2026-11`.
 * @returns Record payment's From and For lists.
 * @throws {ApiError} 404 `no_month` when the month is not open.
 */
export async function getPaymentOptions(db: PaymentOptionsDb, month: string): Promise<PaymentOptionsResponse> {
  const [opened, people, charges] = await Promise.all([
    db.month.findUnique({ where: { month }, select: { month: true } }),
    db.person.findMany({ select: { id: true, name: true, isOwner: true } }),
    db.charge.findMany({
      where: { month: { lte: month }, paidCents: null, amountCents: { gt: 0 } },
      select: CHARGE_SELECT,
    }),
  ]);
  if (!opened) throw new ApiError(404, "no_month", "This month isn’t open.");
  return buildPaymentOptions({
    month,
    today: todayKey(now()),
    people,
    charges: charges.map(({ householdVersion, ...row }) => ({
      ...row,
      config: parseHouseholdConfig(householdVersion.schemaVersion, householdVersion.config),
    })),
  });
}
