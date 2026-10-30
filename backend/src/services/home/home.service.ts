import { parseHouseholdConfig, todayKey, type HomeResponse } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import {
  buildHome,
  type HomeBill,
  type HomeChargeRow,
  type HomeMessage,
  type HomePerson,
} from "@/lib/home/build-home";
import { deriveMonthStatus, isMonthSettled } from "@/lib/home/derive-month-status";
import { messageRecipientIds, monthlyMessagedIds, unsentRecipientIds } from "@/lib/home/message-recipients";
import { currentMonth } from "@/lib/month";
import { openMonthIfNeeded, type MonthOpenDb } from "@/lib/month-open";
import { now } from "@/lib/now";

const CHARGE_SELECT = {
  id: true,
  personId: true,
  payViaPersonId: true,
  category: true,
  label: true,
  amountCents: true,
  dueDate: true,
  paidCents: true,
  paidOn: true,
} as const;

// The rendered text of a message is never needed on Home.
const MESSAGE_SELECT = { personId: true, kind: true, chargeId: true, openedAt: true } as const;

// The bill's PDF lives in `BillFile`, which is never read here.
const BILL_SELECT = { currentChargesCents: true, dueDate: true, paidCents: true, paidOn: true } as const;

/** Unpaid charges above zero of someone other than the owner, in months before the given one. */
interface EarlierUnpaidWhere {
  month: { lt: string };
  paidCents: null;
  amountCents: { gt: 0 };
  person: { isOwner: false };
}

/** The newest opened month with the household version it is pinned to. */
interface OpenedMonthRow {
  month: string;
  householdVersion: { schemaVersion: number; config: unknown };
}

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export type HomeDb = MonthOpenDb & {
  month: {
    findFirst(args: {
      orderBy: { month: "desc" };
      select: { month: true; householdVersion: { select: { schemaVersion: true; config: true } } };
    }): Promise<OpenedMonthRow | null>;
  };
  person: {
    findMany(args: { select: { id: true; name: true; isOwner: true } }): Promise<HomePerson[]>;
  };
  charge: {
    findMany(args: { where: { month: string }; select: typeof CHARGE_SELECT }): Promise<HomeChargeRow[]>;
    count(args: { where: EarlierUnpaidWhere }): Promise<number>;
  };
  bill: {
    findUnique(args: { where: { month: string }; select: typeof BILL_SELECT }): Promise<HomeBill | null>;
  };
  billDraft: {
    findUnique(args: { where: { month: string }; select: { id: true } }): Promise<{ id: string } | null>;
  };
  messageEvent: {
    findMany(args: { where: { month: string }; select: typeof MESSAGE_SELECT }): Promise<HomeMessage[]>;
  };
};

/**
 * Opens the calendar month if it is not open yet, then reads the newest opened month and hands it
 * to `buildHome`. The server picks the month, so the client's time zone never matters.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The Home response for that month.
 * @throws {ApiError} 409 when there is no household version yet, so no month can be open.
 */
export async function getHome(db: HomeDb): Promise<HomeResponse> {
  await openMonthIfNeeded(db, currentMonth());
  const opened = await db.month.findFirst({
    orderBy: { month: "desc" },
    select: { month: true, householdVersion: { select: { schemaVersion: true, config: true } } },
  });
  if (!opened) throw new ApiError(409, "no_household", "Set up the household first.");

  // The draft is looked up by id only: its PDF bytes stay in the database.
  const [people, charges, bill, draft, messages, earlierUnpaid] = await Promise.all([
    db.person.findMany({ select: { id: true, name: true, isOwner: true } }),
    db.charge.findMany({ where: { month: opened.month }, select: CHARGE_SELECT }),
    db.bill.findUnique({ where: { month: opened.month }, select: BILL_SELECT }),
    db.billDraft.findUnique({ where: { month: opened.month }, select: { id: true } }),
    db.messageEvent.findMany({ where: { month: opened.month }, select: MESSAGE_SELECT }),
    // A late payment Record payment can still take keeps its footer.
    db.charge.count({
      where: { month: { lt: opened.month }, paidCents: null, amountCents: { gt: 0 }, person: { isOwner: false } },
    }),
  ]);

  const ownerIds = new Set(people.filter((p) => p.isOwner).map((p) => p.id));
  const unsentMessages = unsentRecipientIds(
    messageRecipientIds(charges, ownerIds),
    monthlyMessagedIds(messages),
  ).length;

  return buildHome({
    month: opened.month,
    today: todayKey(now()),
    status: deriveMonthStatus({
      hasBill: bill !== null,
      hasDraft: draft !== null,
      unsentMessages,
      settled: isMonthSettled(charges, ownerIds, bill),
    }),
    config: parseHouseholdConfig(opened.householdVersion.schemaVersion, opened.householdVersion.config),
    people,
    charges,
    bill,
    messages,
    earlierUnpaid: earlierUnpaid > 0,
  });
}
