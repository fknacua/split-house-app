import { parseHouseholdConfig, todayKey, type ChargeDetailsResponse } from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";
import { correctionChargeProblem } from "@/lib/add-charge/build-correction";
import { ApiError } from "@/lib/api";
import {
  buildChargeDetails,
  type ChargeDetailsCharge,
  type ChargeDetailsMessage,
} from "@/lib/charge-details/build-charge-details";
import { deriveMonthStatus, isMonthSettled, othersAllPaid } from "@/lib/home/derive-month-status";
import {
  isChargeUnsent,
  messageRecipientIds,
  monthlyMessagedIds,
  unsentContext,
  unsentRecipientIds,
} from "@/lib/home/message-recipients";
import { now } from "@/lib/now";

const CHARGE_SELECT = {
  id: true,
  month: true,
  personId: true,
  payViaPersonId: true,
  category: true,
  label: true,
  amountCents: true,
  dueDate: true,
  paidCents: true,
  paidOn: true,
  createdAt: true,
  householdVersion: { select: { schemaVersion: true, config: true } },
  // A correction's own charge, for its Fixes row and Delete dialog; an original's corrections, for its Activity.
  correctsCharge: { select: { label: true, month: true } },
  corrections: { select: { amountCents: true, createdAt: true } },
} as const;

const NEWEST_MONTH_SELECT = { householdVersion: { select: { schemaVersion: true, config: true } } } as const;

// Only what the month's status needs.
const MONTH_CHARGE_SELECT = {
  personId: true,
  payViaPersonId: true,
  category: true,
  amountCents: true,
  paidCents: true,
  createdAt: true,
} as const;

// The rendered text of a message is never needed here.
const MESSAGE_SELECT = { personId: true, kind: true, chargeId: true, openedAt: true } as const;

/** A household version's config as stored. */
interface StoredVersion {
  schemaVersion: number;
  config: unknown;
}

/** The charge row this service reads: the builder's fields, the version pinned to it, and its correction links. */
type ChargeDetailsRow = ChargeDetailsCharge & {
  createdAt: Date;
  householdVersion: StoredVersion;
  correctsCharge: { label: string; month: string } | null;
  corrections: { amountCents: number; createdAt: Date }[];
};

/** A charge of the same month, as much of it as the month's status needs. */
interface MonthChargeRow {
  personId: string;
  payViaPersonId: string | null;
  category: ChargeCategory;
  amountCents: number;
  paidCents: number | null;
  createdAt: Date;
}

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface ChargeDetailsDb {
  month: {
    findFirst(args: { orderBy: { month: "desc" }; select: typeof NEWEST_MONTH_SELECT }): Promise<{ householdVersion: StoredVersion } | null>;
  };
  charge: {
    findUnique(args: { where: { id: string }; select: typeof CHARGE_SELECT }): Promise<ChargeDetailsRow | null>;
    findMany(args: { where: { month: string }; select: typeof MONTH_CHARGE_SELECT }): Promise<MonthChargeRow[]>;
  };
  person: {
    findMany(args: {
      select: { id: true; name: true; isOwner: true };
    }): Promise<{ id: string; name: string; isOwner: boolean }[]>;
  };
  bill: {
    findUnique(args: {
      where: { month: string };
      select: { paidCents: true };
    }): Promise<{ paidCents: number | null } | null>;
  };
  billDraft: {
    findUnique(args: { where: { month: string }; select: { id: true } }): Promise<{ id: string } | null>;
  };
  messageEvent: {
    findMany(args: { where: { month: string }; select: typeof MESSAGE_SELECT }): Promise<ChargeDetailsMessage[]>;
  };
}

/**
 * Reads one charge with its pinned household version and its correction links, the people, its
 * month's charges, bill, draft and messages (for the month's status and the Activity), and the
 * newest month's household (whether Add correction is offered), and hands them to
 * `buildChargeDetails`. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param chargeId - The charge's id.
 * @returns Charge details for that charge.
 * @throws {ApiError} 404 `no_charge` for an unknown charge.
 */
export async function getChargeDetails(db: ChargeDetailsDb, chargeId: string): Promise<ChargeDetailsResponse> {
  const charge = await db.charge.findUnique({ where: { id: chargeId }, select: CHARGE_SELECT });
  if (!charge) throw new ApiError(404, "no_charge", "This charge doesn’t exist.");
  const { householdVersion, createdAt, correctsCharge, corrections, ...row } = charge;
  const { month } = row;

  // The draft is looked up by id only: its PDF bytes stay in the database.
  const [people, monthCharges, bill, draft, messages, newest] = await Promise.all([
    db.person.findMany({ select: { id: true, name: true, isOwner: true } }),
    db.charge.findMany({ where: { month }, select: MONTH_CHARGE_SELECT }),
    db.bill.findUnique({ where: { month }, select: { paidCents: true } }),
    db.billDraft.findUnique({ where: { month }, select: { id: true } }),
    db.messageEvent.findMany({ where: { month }, select: MESSAGE_SELECT }),
    db.month.findFirst({ orderBy: { month: "desc" }, select: NEWEST_MONTH_SELECT }),
  ]);
  const newestConfig = newest
    ? parseHouseholdConfig(newest.householdVersion.schemaVersion, newest.householdVersion.config)
    : null;

  const ownerIds = new Set(people.filter((p) => p.isOwner).map((p) => p.id));
  const monthStatus = deriveMonthStatus({
    hasBill: bill !== null,
    hasDraft: draft !== null,
    unsentMessages: unsentRecipientIds(messageRecipientIds(monthCharges, ownerIds), monthlyMessagedIds(messages)).length,
    othersPaid: othersAllPaid(monthCharges, ownerIds),
    settled: isMonthSettled(monthCharges, ownerIds, bill),
  });

  return buildChargeDetails({
    today: todayKey(now()),
    config: parseHouseholdConfig(householdVersion.schemaVersion, householdVersion.config),
    charge: row,
    people,
    messages,
    monthStatus,
    messageUnsent: isChargeUnsent({ ...row, createdAt }, unsentContext(monthCharges, messages, ownerIds)),
    fixes: correctsCharge,
    corrections,
    canCorrect: newestConfig !== null && correctionChargeProblem({ config: newestConfig }, row) === null,
  });
}
