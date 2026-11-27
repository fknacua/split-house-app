import type { NotificationGroupKey, NotificationTypeRule } from "@splithouse/shared";

/** A `NotificationGroup` row as seeded: one Settings switch. */
export interface NotificationGroupRow {
  key: NotificationGroupKey;
  label: string;
  /** The helper line under the switch. */
  detail: string;
  /** Whether the switch is on before the owner changes it. */
  enabled: boolean;
  sortOrder: number;
}

/** A `NotificationType` row as seeded: one notification, its group, and its kind and rule. */
export type NotificationTypeRow = { key: string; groupKey: NotificationGroupKey } & NotificationTypeRule;

/**
 * The four Settings switches as seeded by migration `notifications` (Data Model "Notifications", deviation R9). The
 * migration holds the same rows; `rows.test.ts` fails when they drift. The database rows are what the app reads.
 */
export const NOTIFICATION_GROUP_ROWS: readonly NotificationGroupRow[] = [
  {
    key: "uploadBill",
    label: "Upload utilities bill",
    detail: "8:00 from the 1st until uploaded",
    enabled: true,
    sortOrder: 1,
  },
  {
    key: "collectPayments",
    label: "Collect tenant payments",
    detail: "8:00 from the day before each due date until paid",
    enabled: true,
    sortOrder: 2,
  },
  {
    key: "payBill",
    label: "Pay utilities bill",
    detail: "8:00 from the day before the due date until paid",
    enabled: true,
    sortOrder: 3,
  },
  {
    key: "fyi",
    label: "FYI updates",
    detail: "Unusual bill, aircon servicing due, month settled · silent",
    enabled: false,
    sortOrder: 4,
  },
];

/**
 * The six notifications as seeded by migration `notifications` and updated by `pay_bill_month`, with the Tech Stack's copy
 * (deviations R10 to R16).
 * Due tomorrow and due today use the Reminders channel (`checks`), overdue Action needed, the FYIs FYI. The migration
 * holds the same rows; `rows.test.ts` fails when they drift.
 */
export const NOTIFICATION_TYPE_ROWS: readonly NotificationTypeRow[] = [
  {
    key: "uploadBill",
    groupKey: "uploadBill",
    kind: "deadline",
    rule: {
      anchor: "upload-day",
      time: "08:00",
      stages: {
        dueTomorrow: {
          channel: "checks",
          title: "Upload {month}’s utilities bill",
          body: "It usually lands tomorrow. Tap to upload it once it’s in.",
        },
        dueToday: {
          channel: "checks",
          title: "Upload {month}’s utilities bill",
          body: "It usually lands today. Tap to upload it.",
        },
        overdue: {
          channel: "action",
          title: "Upload {month}’s utilities bill",
          body: "Not uploaded yet. Tap to upload it.",
        },
      },
    },
  },
  {
    key: "collectPayments",
    groupKey: "collectPayments",
    kind: "deadline",
    rule: {
      anchor: "charge-due",
      time: "08:00",
      stages: {
        dueTomorrow: { channel: "checks", title: "Collect {amount} from {payer}", body: "{items}. Due tomorrow." },
        dueToday: { channel: "checks", title: "Collect {amount} from {payer}", body: "{items}. Due today." },
        overdue: { channel: "action", title: "Collect {amount} from {payer}", body: "{items}. Overdue since {due}." },
      },
    },
  },
  {
    key: "payBill",
    groupKey: "payBill",
    kind: "deadline",
    rule: {
      anchor: "bill-due",
      time: "08:00",
      stages: {
        dueTomorrow: {
          channel: "checks",
          title: "Pay {month}’s utilities bill",
          body: "Collected {collected} of {total}. Due tomorrow, {due}.",
        },
        dueToday: {
          channel: "checks",
          title: "Pay {month}’s utilities bill",
          body: "Collected {collected} of {total}. Due today.",
        },
        overdue: {
          channel: "action",
          title: "Pay {month}’s utilities bill",
          body: "Collected {collected} of {total}. Overdue since {due}.",
        },
      },
    },
  },
  {
    key: "airconDue",
    groupKey: "fyi",
    kind: "dated",
    rule: {
      anchor: "last-aircon",
      offsetDays: 90,
      time: "08:00",
      channel: "fyi",
      title: "Aircon servicing due?",
      body: "It’s been 3 months since the last one.",
    },
  },
  {
    key: "monthSettled",
    groupKey: "fyi",
    kind: "event",
    rule: {
      trigger: "month-settled",
      delay: "immediate",
      expiresAfterDays: 3,
      channel: "fyi",
      title: "{month} is settled",
      body: "Everyone has paid and the utilities bill is covered.",
    },
  },
  {
    key: "unusualBill",
    groupKey: "fyi",
    kind: "event",
    rule: {
      trigger: "unusual-bill",
      delay: "immediate",
      expiresAfterDays: 3,
      channel: "fyi",
      title: "Unusual bill amount",
      body: "{month}’s {amount} bill is {change} than your recent bills.",
    },
  },
];
