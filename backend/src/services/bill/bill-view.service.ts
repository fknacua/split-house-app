import { parseHouseholdConfig, todayKey, type BillViewResponse } from "@splithouse/shared";
import type { MessageKind } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api";
import {
  buildBillView,
  type BillViewBillRow,
  type BillViewChargeRow,
  type BillViewPersonRow,
} from "@/lib/bill/build-bill-view";
import { now } from "@/lib/now";
import { getActiveMonth, type ActiveMonthDb } from "@/services/months/active-month.service";

// The PDF's bytes are never read here: only its name and page count.
const BILL_SELECT = {
  currentChargesCents: true,
  billingPeriodStart: true,
  billingPeriodEnd: true,
  dueDate: true,
  lines: true,
  paidCents: true,
  paidOn: true,
  createdAt: true,
  file: { select: { filename: true, sizeBytes: true, pageCount: true } },
} as const;

const CHARGE_SELECT = {
  personId: true,
  payViaPersonId: true,
  category: true,
  amountCents: true,
  dueDate: true,
  paidCents: true,
  paidOn: true,
} as const;

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface BillViewDb extends ActiveMonthDb {
  bill: {
    findUnique(args: { where: { month: string }; select: typeof BILL_SELECT }): Promise<BillViewBillRow | null>;
  };
  month: ActiveMonthDb["month"] & {
    findUnique(args: {
      where: { month: string };
      select: { householdVersion: { select: { schemaVersion: true; config: true } } };
    }): Promise<{ householdVersion: { schemaVersion: number; config: unknown } } | null>;
  };
  person: {
    findMany(args: { select: { id: true; name: true; isOwner: true } }): Promise<BillViewPersonRow[]>;
  };
  charge: {
    findMany(args: { where: { month: string }; select: typeof CHARGE_SELECT }): Promise<BillViewChargeRow[]>;
  };
  messageEvent: {
    findMany(args: {
      where: { month: string };
      select: { personId: true; kind: true };
    }): Promise<{ personId: string; kind: MessageKind }[]>;
  };
}

/**
 * Reads the month's saved bill (without its PDF bytes), its charges, messages and pinned household
 * version, and hands them to `buildBillView`. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param month - The month key, e.g. `2026-11`.
 * @returns View bill for that month.
 * @throws {ApiError} 404 `no_bill` when the month has no saved bill.
 */
export async function getBillView(db: BillViewDb, month: string): Promise<BillViewResponse> {
  const [bill, opened, people, charges, messages, activeMonth] = await Promise.all([
    db.bill.findUnique({ where: { month }, select: BILL_SELECT }),
    db.month.findUnique({
      where: { month },
      select: { householdVersion: { select: { schemaVersion: true, config: true } } },
    }),
    db.person.findMany({ select: { id: true, name: true, isOwner: true } }),
    db.charge.findMany({ where: { month }, select: CHARGE_SELECT }),
    db.messageEvent.findMany({ where: { month }, select: { personId: true, kind: true } }),
    getActiveMonth(db),
  ]);
  // A saved bill always has its month open, so a missing month only means there is no bill either.
  if (!bill || !opened) throw new ApiError(404, "no_bill", "This month has no saved bill.");

  return buildBillView({
    month,
    today: todayKey(now()),
    isActiveMonth: month === activeMonth,
    config: parseHouseholdConfig(opened.householdVersion.schemaVersion, opened.householdVersion.config),
    people,
    charges,
    bill,
    messages,
  });
}
