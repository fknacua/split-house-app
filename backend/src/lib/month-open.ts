import { currentMonth } from "@/lib/month";
import { parseHouseholdConfig } from "@/lib/household/config";
import { buildMonthCharges } from "@/lib/split/engine";

export interface VersionRow {
  id: string;
  startsFromMonth: string;
  schemaVersion: number;
  config: unknown;
}

export interface OpenedMonth {
  month: string;
  householdVersionId: string;
}

/**
 * The slice of the Prisma client this module uses inside a transaction, so
 * tests can pass an in-memory fake. The real client satisfies it structurally.
 */
export interface MonthOpenTx {
  month: {
    findUnique(args: { where: { month: string } }): Promise<OpenedMonth | null>;
    create(args: { data: OpenedMonth }): Promise<OpenedMonth>;
  };
  householdVersion: {
    findFirst(args: {
      where: { startsFromMonth: { lte: string } };
      orderBy: { startsFromMonth: "desc" };
    }): Promise<VersionRow | null>;
  };
  charge: {
    createMany(args: {
      data: {
        month: string;
        personId: string;
        payViaPersonId: string | null;
        category: "RENT" | "RECURRING";
        label: string;
        amountCents: number;
        dueDate: Date | null;
        householdVersionId: string;
      }[];
    }): Promise<unknown>;
  };
}

export interface MonthOpenDb extends MonthOpenTx {
  $transaction<T>(fn: (tx: MonthOpenTx) => Promise<T>): Promise<T>;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

/**
 * Opens a month on the first request on or after the 1st: creates the Month,
 * pins the newest household version starting on or before it, and creates the
 * rent and recurring charges, all in one transaction.
 *
 * Idempotent: an already open month is returned untouched, and a concurrent
 * request that loses the race on the unique month key gets the winner's row.
 *
 * @param db Prisma client (or any object matching {@link MonthOpenDb}).
 * @param month Month key `YYYY-MM`. Defaults to the current month in Asia/Singapore.
 * @returns The open month and its pinned household version id, or `null` when
 * no household version starts on or before `month` (first run), in which case
 * nothing is created.
 * @throws If the pinned version's config has an unknown `schemaVersion` or is
 * invalid; the month is rolled back.
 */
export async function openMonthIfNeeded(
  db: MonthOpenDb,
  month: string = currentMonth(),
): Promise<OpenedMonth | null> {
  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.month.findUnique({ where: { month } });
      if (existing) return existing;

      const version = await tx.householdVersion.findFirst({
        where: { startsFromMonth: { lte: month } },
        orderBy: { startsFromMonth: "desc" },
      });
      if (!version) return null;

      const config = parseHouseholdConfig(version.schemaVersion, version.config);
      const charges = buildMonthCharges(config, month);

      const opened = await tx.month.create({ data: { month, householdVersionId: version.id } });
      await tx.charge.createMany({
        data: charges.map((c) => ({
          month,
          personId: c.personId,
          payViaPersonId: c.payViaPersonId,
          category: c.category as "RENT" | "RECURRING",
          label: c.label,
          amountCents: c.amountCents,
          dueDate: c.dueDate ? new Date(c.dueDate) : null,
          householdVersionId: version.id,
        })),
      });
      return opened;
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    return db.month.findUnique({ where: { month } });
  }
}
