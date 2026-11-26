import { parseHouseholdConfig, type NotificationPlanResponse } from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";
import { buildNotificationPlan, uploadMonths, type PlanCharge, type PlanPerson } from "@/lib/notifications/build-plan";
import { expiredEventIds, notificationEventParamsSchema, type PlanEvent } from "@/lib/notifications/events";
import { notificationGroupSwitches } from "@/lib/notifications/groups";
import { now } from "@/lib/now";
import { getNotificationGroups, type NotificationGroupsDb } from "@/services/notifications/notification-groups.service";
import { getNotificationTypes, type NotificationTypesDb } from "@/services/notifications/notification-types.service";

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
  charges: {
    where: { category: "UTILITIES" as ChargeCategory },
    select: { personId: true, amountCents: true, paidCents: true },
  },
} as const;

const EVENT_SELECT = {
  id: true,
  key: true,
  typeKey: true,
  params: true,
  status: true,
  createdAt: true,
  fireAt: true,
} as const;

/** The events the list can hold: every pending one, and the acknowledged ones whose time hasn't passed. */
type EventWhere = { OR: [{ status: "PENDING" }, { status: "SCHEDULED"; fireAt: { gt: Date } }] };

/** An event row as {@link EVENT_SELECT} reads it. */
interface EventRow {
  id: string;
  key: string;
  typeKey: string;
  params: unknown;
  status: "PENDING" | "SCHEDULED" | "EXPIRED";
  createdAt: Date;
  fireAt: Date | null;
}

/** A bill row as {@link BILL_SELECT} reads it. */
interface BillRow {
  month: string;
  currentChargesCents: number;
  dueDate: Date | null;
  paidCents: number | null;
  charges: { personId: string; amountCents: number; paidCents: number | null }[];
}

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface NotificationPlanDb extends NotificationGroupsDb, NotificationTypesDb {
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
    findFirst(args: {
      where: { category: "AIRCON" };
      orderBy: { createdAt: "desc" };
      select: { createdAt: true };
    }): Promise<{ createdAt: Date } | null>;
  };
  bill: {
    findMany(args: {
      where: { OR: [{ paidCents: null }, { month: { in: string[] } }] };
      select: typeof BILL_SELECT;
    }): Promise<BillRow[]>;
  };
  notificationEvent: {
    findMany(args: { where: EventWhere; select: typeof EVENT_SELECT }): Promise<EventRow[]>;
    updateMany(args: {
      where: { id: { in: string[] }; status: "PENDING" };
      data: { status: "EXPIRED" };
    }): Promise<{ count: number }>;
  };
}

/** Reads a stored event for the list; one whose params aren't text by placeholder keeps its placeholders unfilled. */
function planEvent(row: EventRow): PlanEvent[] {
  if (row.status === "EXPIRED") return [];
  const params = notificationEventParamsSchema.safeParse(row.params);
  return [{ ...row, status: row.status, params: params.success ? params.data : {} }];
}

/**
 * Reads what the notifications need and builds the list the phone schedules: every opened month with its config, the
 * people, every unpaid charge of someone other than the owner, the bills not marked paid and the saved bills of the
 * months the upload reminder covers, when the latest aircon charge was added, the pending and acknowledged event FYIs,
 * the notification types and the switches. It opens no month, so a month not opened yet is planned from the date
 * alone. Its one write marks a pending event past its type's `expiresAfterDays` as expired, so it leaves for good.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @returns The list for the next 14 days; empty until First run has finished.
 * @throws {z.ZodError} When a stored notification type is one the code doesn't know.
 */
export async function getNotificationPlan(db: NotificationPlanDb): Promise<NotificationPlanResponse> {
  const at = now();
  const months = await db.month.findMany({ select: MONTH_SELECT });
  const [people, unpaidCharges, bills, lastAircon, eventRows, groups, types] = await Promise.all([
    db.person.findMany({ select: { id: true, name: true, isOwner: true } }),
    db.charge.findMany({
      where: { paidCents: null, amountCents: { gt: 0 }, person: { isOwner: false } },
      select: CHARGE_SELECT,
    }),
    db.bill.findMany({
      where: { OR: [{ paidCents: null }, { month: { in: uploadMonths(at, months.map((m) => m.month)) } }] },
      select: BILL_SELECT,
    }),
    db.charge.findFirst({ where: { category: "AIRCON" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    db.notificationEvent.findMany({
      where: { OR: [{ status: "PENDING" }, { status: "SCHEDULED", fireAt: { gt: at } }] },
      select: EVENT_SELECT,
    }),
    getNotificationGroups(db),
    getNotificationTypes(db),
  ]);

  const events = eventRows.flatMap(planEvent);
  const expired = expiredEventIds(at, types, events);
  if (expired.length > 0) {
    await db.notificationEvent.updateMany({
      where: { id: { in: expired }, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
  }

  return {
    notifications: buildNotificationPlan({
      now: at,
      switches: notificationGroupSwitches(groups),
      types,
      people,
      months: months.map((m) => ({
        month: m.month,
        config: parseHouseholdConfig(m.householdVersion.schemaVersion, m.householdVersion.config),
      })),
      unpaidCharges,
      bills: bills.map(({ charges, ...bill }) => ({ ...bill, utilities: charges })),
      lastAirconAt: lastAircon?.createdAt ?? null,
      events,
    }),
  };
}
