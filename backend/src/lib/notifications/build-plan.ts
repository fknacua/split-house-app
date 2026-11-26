import {
  currentMonth,
  dateKeyOf,
  formatCents,
  formatDateShort,
  formatMonthName,
  formatMonthShort,
  todayKey,
  type DatedAnchor,
  type DatedRule,
  type DeadlineAnchor,
  type DeadlineRule,
  type HomeTarget,
  type HouseholdConfig,
  type NotificationAction,
  type NotificationGroupSwitches,
  type PlannedNotification,
} from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";
import { correctionName, type CorrectedCharge } from "@/lib/corrections/correction-name";
import { billDueDateKey, chargeDueDate } from "@/lib/home/due-dates";
import { eventNotifications, type PlanEvent } from "./events";
import type { NotificationTypeRow } from "./rows";

/**
 * How far ahead the list goes. Android allows an app 500 scheduled alarms, and daily overdue reminders over a longer
 * window could pass it; every launch and every write rebuilds the list, so it refills as days pass.
 */
export const PLAN_WINDOW_DAYS = 14;

/** The three stages of a deadline, in the order they come. */
const STAGES = ["dueTomorrow", "dueToday", "overdue"] as const;

/** One stage of a deadline: the day before it, the day itself, or any day after it. */
type Stage = (typeof STAGES)[number];

/** Categories a reminder names by their label in lower case (`Nov utilities`); others keep it as written. */
const LOWER_CASE_LABELS: ReadonlySet<ChargeCategory> = new Set(["RENT", "UTILITIES", "AIRCON"]);

/** The order a payer's charges are named in, after their due dates. */
const CATEGORY_ORDER: readonly ChargeCategory[] = ["RENT", "UTILITIES", "AIRCON", "RECURRING", "ONE_OFF", "CORRECTION"];

/** How many charges a reminder names before it counts the rest (`… and 2 more`). */
const MAX_NAMED_ITEMS = 3;

/** Someone in the household, as much as the plan needs. */
export interface PlanPerson {
  id: string;
  name: string;
  isOwner: boolean;
}

/** An opened month and the config pinned to it, for due days. */
export interface PlanMonth {
  month: string;
  config: HouseholdConfig;
}

/** An unpaid charge, as much of it as the plan needs. */
export interface PlanCharge {
  id: string;
  month: string;
  personId: string;
  payViaPersonId: string | null;
  category: ChargeCategory;
  label: string;
  amountCents: number;
  dueDate: Date | null;
  /** What a correction fixes; null for any other charge. */
  correctsCharge: CorrectedCharge | null;
}

/** A saved utilities bill and its month's utilities charges. */
export interface PlanBill {
  month: string;
  currentChargesCents: number;
  dueDate: Date | null;
  /** Set once the bill is marked paid (Pay bill). */
  paidCents: number | null;
  utilities: { personId: string; amountCents: number; paidCents: number | null }[];
}

/** Everything the plan is built from. */
export interface PlanInput {
  /** The moment the plan is built; nothing at or before it is planned. */
  now: Date;
  /** Whether each Settings switch is on. */
  switches: NotificationGroupSwitches;
  /** The notification types, as stored. */
  types: readonly NotificationTypeRow[];
  people: PlanPerson[];
  /** Every opened month. With none, First run hasn't finished and nothing is planned. */
  months: PlanMonth[];
  /** Every unpaid charge, of any month. */
  unpaidCharges: PlanCharge[];
  /** Every bill not marked paid, and the saved bills of every month in {@link uploadMonths}. */
  bills: PlanBill[];
  /** When the latest aircon charge was added (corrections don't count), or null before the first one. */
  lastAirconAt: Date | null;
  /** The pending and acknowledged event FYIs (settled, unusual bill). */
  events: readonly PlanEvent[];
}

/** One reminder a deadline anchor gives for a day and stage, before its text is filled in. */
interface DeadlineFill {
  /** What the reminder is about, unique for the anchor on that day and stage: a month, or a payer's id. */
  subject: string;
  values: Record<string, string>;
  tap: HomeTarget | null;
  actions: NotificationAction[];
}

/** What every anchor reads, worked out once per plan. */
interface PlanContext {
  /** The months the upload reminder covers, with whether each has a saved bill. */
  uploads: { month: string; saved: boolean }[];
  /** Unpaid charges of someone other than the owner, above zero, with their due dates; others are left out. */
  charges: (PlanCharge & { due: string })[];
  /** Unpaid bills with their due dates, and what the others have paid of their utilities. */
  bills: { month: string; due: string; collectedCents: number; totalCents: number }[];
  name: (id: string) => string;
  lastAirconAt: Date | null;
}

/** Finds the reminders of one deadline anchor for one morning and stage. */
type DeadlinePlanner = (ctx: PlanContext, day: string, stage: Stage) => DeadlineFill[];

/** Finds the one day a dated notification fires, or null when there isn't one. */
type DatedPlanner = (ctx: PlanContext, rule: DatedRule) => string | null;

/** One function per deadline anchor, keyed so a new anchor doesn't compile until it has one. */
const DEADLINE_PLANNERS: Readonly<Record<DeadlineAnchor, DeadlinePlanner>> = {
  "upload-day": uploadDay,
  "charge-due": chargeDue,
  "bill-due": billDue,
};

/** One function per dated anchor, keyed so a new anchor doesn't compile until it has one. */
const DATED_PLANNERS: Readonly<Record<DatedAnchor, DatedPlanner>> = {
  "last-aircon": (ctx, rule) => (ctx.lastAirconAt ? addDays(dateKeyOf(ctx.lastAirconAt), rule.offsetDays) : null),
};

/**
 * The months the upload reminder covers: every opened month, this calendar month and the month the window ends in,
 * none before the first opened month (First run's start month). The service reads the saved bills of these months.
 *
 * @param now - The moment the plan is built.
 * @param openedMonths - Every opened month, `YYYY-MM`.
 * @returns The months in order, each once; empty with no month opened.
 */
export function uploadMonths(now: Date, openedMonths: readonly string[]): string[] {
  if (openedMonths.length === 0) return [];
  const first = [...openedMonths].sort()[0];
  const last = currentMonth(new Date(now.getTime() + PLAN_WINDOW_DAYS * 86_400_000));
  const months = new Set([...openedMonths, currentMonth(now), last]);
  return [...months].filter((m) => m >= first).sort();
}

/**
 * Builds the reminders for the next {@link PLAN_WINDOW_DAYS} days from the notification types, following the
 * switches. A deadline gives three stages at its time: due tomorrow (the day before), due today and overdue (every day
 * after, until done). Upload the utilities bill is due on the 2nd until the month's bill is saved, Collect tenant
 * payments on each charge's due date (one reminder per payer, per stage, per morning; a routed charge is in its
 * payer's) until it is paid, and Pay utilities bill on the bill's due date until it is marked paid. Aircon servicing
 * due fires once, its offset after the latest aircon charge was added. Only charges of someone other than the owner
 * above zero count, so a refund never appears. The event FYIs come from {@link eventNotifications}. Times are
 * Asia/Singapore. Pure.
 *
 * @param input - The moment, the switches, the types, the data and the events.
 * @returns The notifications in time order (then by id), each with an id that is stable across rebuilds.
 */
export function buildNotificationPlan(input: PlanInput): PlannedNotification[] {
  if (input.months.length === 0) return [];

  const end = new Date(input.now.getTime() + PLAN_WINDOW_DAYS * 86_400_000);
  const days = daysBetween(todayKey(input.now), todayKey(end));
  const ctx = planContext(input);

  const planned = input.types
    .filter((type) => input.switches[type.groupKey])
    .flatMap((type): PlannedNotification[] => {
      if (type.kind === "deadline") return deadlineReminders(type.key, type.rule, ctx, days);
      if (type.kind === "dated") return datedReminder(type.key, type.rule, ctx);
      return [];
    });
  const events = eventNotifications(input.now, input.switches, input.types, input.events);

  return [...planned, ...events]
    .filter((n) => {
      const time = new Date(n.at);
      return time > input.now && time < end;
    })
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime() || a.id.localeCompare(b.id));
}

/** Works out what the anchors read, once. */
function planContext(input: PlanInput): PlanContext {
  const owners = new Set(input.people.filter((p) => p.isOwner).map((p) => p.id));
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const configs = new Map(input.months.map((m) => [m.month, m.config]));
  const saved = new Set(input.bills.map((b) => b.month));

  const charges = input.unpaidCharges.flatMap((c) => {
    const config = configs.get(c.month);
    const due = config ? chargeDueDate(c.month, config, c) : null;
    return !owners.has(c.personId) && c.amountCents > 0 && due ? [{ ...c, due }] : [];
  });

  const bills = input.bills.flatMap((bill) => {
    const config = configs.get(bill.month);
    const due = config && bill.paidCents === null ? billDueDateKey(bill.month, config, bill.dueDate) : null;
    if (!due) return [];
    const collectedCents = bill.utilities
      .filter((c) => !owners.has(c.personId) && c.paidCents !== null)
      .reduce((sum, c) => sum + Math.min(c.paidCents ?? 0, c.amountCents), 0);
    return [{ month: bill.month, due, collectedCents, totalCents: bill.currentChargesCents }];
  });

  return {
    uploads: uploadMonths(input.now, input.months.map((m) => m.month)).map((month) => ({
      month,
      saved: saved.has(month),
    })),
    charges,
    bills,
    name: (id) => names.get(id) ?? "Someone",
    lastAirconAt: input.lastAirconAt,
  };
}

/** Every reminder of a deadline type, for each morning and stage in the window. */
function deadlineReminders(key: string, rule: DeadlineRule, ctx: PlanContext, days: string[]): PlannedNotification[] {
  const planner = DEADLINE_PLANNERS[rule.anchor];
  return days.flatMap((day) =>
    STAGES.flatMap((stage) =>
      planner(ctx, day, stage).map((fill) => ({
        id: `${key}:${stage}:${fill.subject}:${day}`,
        ...text(rule.stages[stage], fill.values),
        at: at(day, rule.time),
        tap: fill.tap,
        actions: fill.actions,
        acknowledge: false,
      })),
    ),
  );
}

/** A dated type's one notification, on the day its anchor gives; none when there is no such day. */
function datedReminder(key: string, rule: DatedRule, ctx: PlanContext): PlannedNotification[] {
  const day = DATED_PLANNERS[rule.anchor](ctx, rule);
  if (!day) return [];
  return [{ id: `${key}:${day}`, ...text(rule, {}), at: at(day, rule.time), tap: null, actions: [], acknowledge: false }];
}

/** Whether a reminder on `day` is in `stage` for a deadline on `deadline`. */
function inStage(day: string, deadline: string, stage: Stage): boolean {
  if (stage === "dueTomorrow") return addDays(day, 1) === deadline;
  if (stage === "dueToday") return day === deadline;
  return day > deadline;
}

/** Upload: due on the 2nd of each covered month whose bill isn't saved. Tapping opens Bill upload for that month. */
function uploadDay(ctx: PlanContext, day: string, stage: Stage): DeadlineFill[] {
  return ctx.uploads
    .filter((u) => !u.saved && inStage(day, `${u.month}-02`, stage))
    .map((u): DeadlineFill => ({
      subject: u.month,
      values: { month: formatMonthName(u.month) },
      tap: { kind: "bill-upload", month: u.month },
      actions: [],
    }));
}

/**
 * Collect: one reminder per payer. Due tomorrow and due today hold the payer's charges due that day; overdue holds
 * every overdue charge of theirs, and `{due}` is the earliest. Paid and Nudge open on the earliest charge (14.9 opens
 * them on all of them).
 */
function chargeDue(ctx: PlanContext, day: string, stage: Stage): DeadlineFill[] {
  const byPayer = new Map<string, PlanContext["charges"]>();
  for (const c of ctx.charges.filter((c) => inStage(day, c.due, stage))) {
    const payer = c.payViaPersonId ?? c.personId;
    byPayer.set(payer, [...(byPayer.get(payer) ?? []), c]);
  }
  return [...byPayer].map(([payer, charges]): DeadlineFill => {
    const sorted = [...charges].sort(
      (a, b) =>
        a.due.localeCompare(b.due) ||
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
        a.month.localeCompare(b.month) ||
        a.label.localeCompare(b.label),
    );
    const first = sorted[0];
    return {
      subject: payer,
      values: {
        payer: ctx.name(payer),
        amount: formatCents(sorted.reduce((sum, c) => sum + c.amountCents, 0)),
        items: listItems(sorted.map((c) => itemName(c, ctx.name))),
        due: formatDateShort(first.due),
      },
      tap: null,
      actions: [
        { kind: "paid", target: { kind: "mark-paid", chargeId: first.id } },
        { kind: "nudge", target: { kind: "send-nudge", personId: payer, chargeId: first.id } },
      ],
    };
  });
}

/** Pay bill: due on each unpaid bill's due date, with what the others have paid of their utilities. */
function billDue(ctx: PlanContext, day: string, stage: Stage): DeadlineFill[] {
  return ctx.bills
    .filter((b) => inStage(day, b.due, stage))
    .map((b): DeadlineFill => ({
      subject: b.month,
      values: {
        collected: formatCents(b.collectedCents),
        total: formatCents(b.totalCents),
        due: formatDateShort(b.due),
      },
      tap: null,
      actions: [],
    }));
}

/**
 * How a reminder names a charge: `Nov rent`, `Nov Starhub`, a routed one with whose it is (`Nov utilities for Sam`),
 * or a correction by its short name (`Correction · Utilities Oct`), which already says its month.
 */
function itemName(charge: PlanCharge, name: (id: string) => string): string {
  const forWhom = charge.payViaPersonId ? ` for ${name(charge.personId)}` : "";
  const correction = correctionName(charge.correctsCharge);
  if (correction) return `${correction}${forWhom}`;
  const label = LOWER_CASE_LABELS.has(charge.category) ? charge.label.toLowerCase() : charge.label;
  return `${formatMonthShort(charge.month)} ${label}${forWhom}`;
}

/** Names joined with commas and "and"; past three, the first two and how many more (`a, b and 2 more`). */
function listItems(names: string[]): string {
  if (names.length > MAX_NAMED_ITEMS) return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** A text's channel, and its title and body with the placeholders filled in. */
function text(
  template: { channel: PlannedNotification["channel"]; title: string; body: string },
  values: Record<string, string>,
): Pick<PlannedNotification, "channel" | "title" | "body"> {
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
  return { channel: template.channel, title: fill(template.title), body: fill(template.body) };
}

/** A date key and an `HH:mm` time as an ISO string with the Singapore offset. */
function at(day: string, time: string): string {
  return `${day}T${time}:00+08:00`;
}

/** Every date key from `start` to `end`, both included. */
function daysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

/** A date key moved by some days. */
function addDays(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const moved = new Date(Date.UTC(year, month - 1, date + delta));
  return moved.toISOString().slice(0, 10);
}
