import { parseHouseholdConfig, todayKey, type HomeResponse } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { buildHome, type HomeChargeRow, type HomePerson } from "@/lib/home/build-home";
import { deriveMonthStatus } from "@/lib/home/derive-month-status";
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
} as const;

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
  };
  bill: {
    findUnique(args: { where: { month: string }; select: { id: true } }): Promise<{ id: string } | null>;
  };
  billDraft: {
    findUnique(args: { where: { month: string }; select: { id: true } }): Promise<{ id: string } | null>;
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
  const [people, charges, bill, draft] = await Promise.all([
    db.person.findMany({ select: { id: true, name: true, isOwner: true } }),
    db.charge.findMany({ where: { month: opened.month }, select: CHARGE_SELECT }),
    db.bill.findUnique({ where: { month: opened.month }, select: { id: true } }),
    db.billDraft.findUnique({ where: { month: opened.month }, select: { id: true } }),
  ]);

  return buildHome({
    month: opened.month,
    today: todayKey(now()),
    status: deriveMonthStatus({ hasBill: bill !== null, hasDraft: draft !== null }),
    config: parseHouseholdConfig(opened.householdVersion.schemaVersion, opened.householdVersion.config),
    people,
    charges,
  });
}
