import { addMonths, parseHouseholdConfig, type NotificationPlanResponse } from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";
import { currentMonth } from "@/lib/month";
import { buildNotificationPlan, type PlanCharge, type PlanPerson } from "@/lib/notifications/build-plan";
import { now } from "@/lib/now";
import { readNotificationToggles, type NotificationTogglesDb } from "@/services/settings/settings.service";

const MONTH_SELECT = { month: true, householdVersion: { select: { schemaVersion: true, config: true } } } as const;

const CHARGE_SELECT = {
  id: true,
  month: true,
  personId: true,
  payViaPersonId: true,
  category: true,
  label: true,
  amountCents: true,
  dueDate: true,
  correctsCharge: { select: { label: true, month: true } },
} as const;

const BILL_SELECT = {
  month: true,
  currentChargesCents: true,
  dueDate: true,
  paidCents: true,
  charges: { where: { category: "UTILITIES" as ChargeCategory }, select: { personId: true, amountCents: true, paidCents: true } },
} as const;

/** A bill row as {@link BILL_SELECT} reads it. */
interface BillRow {
  month: string;
  currentChargesCents: number;
  dueDate: Date | null;
  paidCents: number | null;
  charges: { personId: string; amountCents: number; paidCents: number | null }[];
}

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface NotificationPlanDb extends NotificationTogglesDb {
  month: {
    findMany(args: {
      select: typeof MONTH_SELECT;
    }): Promise<{ month: string; householdVersion: { schemaVersion: number; config: unknown } }[]>;
  };
  person: {
    findMany(args: { select: { id: true; name: true; isOwner: true } }): Promise<PlanPerson[]>;
  };
  charge: {
    findMany(args: {
      where: { paidCents: null; amountCents: { gt: 0 }; person: { isOwner: false } };
      select: typeof CHARGE_SELECT;
    }): Promise<PlanCharge[]>;
  };
  bill: {
    findMany(args: {
      where: { OR: [{ paidCents: null }, { month: { in: string[] } }] };
      select: typeof BILL_SELECT;
    }): Promise<BillRow[]>;
  };
}

/**
 * Reads what the notifications need and builds the plan the phone schedules: every opened month with its config, the
 * people, every unpaid charge of someone other than the owner, the bills not marked paid and this calendar month's
 * and next month's bills, and the toggles. Read-only: it opens no month, so a month not opened yet is planned from the
 * date alone.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The plan from now to the end of next month; empty until First run has finished.
 */
export async function getNotificationPlan(db: NotificationPlanDb): Promise<NotificationPlanResponse> {
  const calendar = currentMonth();
  const [months, people, unpaidCharges, bills, toggles] = await Promise.all([
    db.month.findMany({ select: MONTH_SELECT }),
    db.person.findMany({ select: { id: true, name: true, isOwner: true } }),
    db.charge.findMany({
      where: { paidCents: null, amountCents: { gt: 0 }, person: { isOwner: false } },
      select: CHARGE_SELECT,
    }),
    db.bill.findMany({
      where: { OR: [{ paidCents: null }, { month: { in: [calendar, addMonths(calendar, 1)] } }] },
      select: BILL_SELECT,
    }),
    readNotificationToggles(db),
  ]);

  return {
    notifications: buildNotificationPlan({
      now: now(),
      toggles,
      people,
      months: months.map((m) => ({
        month: m.month,
        config: parseHouseholdConfig(m.householdVersion.schemaVersion, m.householdVersion.config),
      })),
      unpaidCharges,
      bills: bills.map(({ charges, ...bill }) => ({ ...bill, utilities: charges })),
    }),
  };
}
