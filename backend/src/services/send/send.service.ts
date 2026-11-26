import { parseHouseholdConfig, todayKey, type SendMode, type SendResponse } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { now } from "@/lib/now";
import { buildSend, sendToOptions, type SendCharge, type SendInput, type SendMessageEvent } from "@/lib/send/build-send";
import { getActiveMonth, type ActiveMonthDb } from "@/services/months/active-month.service";
import { readMessageTemplates, type MessageTemplatesDb } from "@/services/templates/message-templates.service";

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
  correctsCategory: true,
  correctsMonth: true,
  createdAt: true,
  correctsCharge: { select: { label: true, month: true } },
} as const;

const MESSAGE_SELECT = { personId: true, kind: true, chargeId: true, openedAt: true } as const;

const PERSON_SELECT = { id: true, name: true, whatsappE164: true } as const;

/** The month's charges and earlier months' unpaid corrections, everyone's. */
interface SendChargesWhere {
  OR: [{ month: string }, { month: { lt: string }; category: "CORRECTION"; paidCents: null }];
}

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface SendDb extends ActiveMonthDb, MessageTemplatesDb {
  month: ActiveMonthDb["month"] & {
    findUnique(args: {
      where: { month: string };
      select: { householdVersion: { select: { schemaVersion: true; config: true } } };
    }): Promise<{ householdVersion: { schemaVersion: number; config: unknown } } | null>;
  };
  person: {
    findMany(args: { select: typeof PERSON_SELECT }): Promise<{ id: string; name: string; whatsappE164: string | null }[]>;
  };
  bill: {
    findUnique(args: {
      where: { month: string };
      select: { currentChargesCents: true };
    }): Promise<{ currentChargesCents: number } | null>;
  };
  charge: {
    findMany(args: { where: SendChargesWhere; select: typeof CHARGE_SELECT }): Promise<SendCharge[]>;
  };
  messageEvent: {
    findMany(args: { where: { month: string }; select: typeof MESSAGE_SELECT }): Promise<SendMessageEvent[]>;
  };
}

/**
 * Reads the active month with its pinned household version, the current wording, the people, the
 * bill's total, everyone's charges and the month's message events: what `buildSend` reads.
 * Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param mode - Monthly message or nudge.
 * @returns The builder's input.
 * @throws {ApiError} 404 `no_month` when the active month is not open.
 */
async function loadSendInput(db: SendDb, mode: SendMode): Promise<SendInput> {
  const month = await getActiveMonth(db);
  const [opened, people, bill, charges, messages, templates] = await Promise.all([
    db.month.findUnique({
      where: { month },
      select: { householdVersion: { select: { schemaVersion: true, config: true } } },
    }),
    db.person.findMany({ select: PERSON_SELECT }),
    db.bill.findUnique({ where: { month }, select: { currentChargesCents: true } }),
    db.charge.findMany({
      where: { OR: [{ month }, { month: { lt: month }, category: "CORRECTION", paidCents: null }] },
      select: CHARGE_SELECT,
    }),
    db.messageEvent.findMany({ where: { month }, select: MESSAGE_SELECT }),
    readMessageTemplates(db),
  ]);
  if (!opened) throw new ApiError(404, "no_month", "This month isn’t open.");

  return {
    mode,
    month,
    today: todayKey(now()),
    config: parseHouseholdConfig(opened.householdVersion.schemaVersion, opened.householdVersion.config),
    templates,
    people,
    billCents: bill?.currentChargesCents ?? null,
    charges,
    messages,
  };
}

/**
 * Checks that the person can be picked in this mode's To list.
 *
 * @throws {ApiError} 404 `no_person` when they can't: unknown, the owner, paying via someone else,
 * not getting a monthly message (monthly), or with nothing overdue to nudge (nudge).
 */
function assertInToList(input: SendInput, personId: string): void {
  if (sendToOptions(input).some((o) => o.personId === personId)) return;
  throw new ApiError(
    404,
    "no_person",
    input.mode === "monthly" ? "That person doesn’t get a monthly message." : "That person has nothing overdue to nudge.",
  );
}

/**
 * The Send message sheet for the active month, as it opens.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param query - The mode, who is picked (none for nobody) and, in nudge mode, the charges Nudge
 * opened on. Those that are the person's overdue charges are ticked; when none is, their
 * earliest-due one is.
 * @returns The sheet.
 * @throws {ApiError} 404 `no_month` when the active month is not open; 404 `no_person` when the
 * person isn't in the mode's To list.
 */
export async function getSendSheet(
  db: SendDb,
  query: { mode: SendMode; personId?: string; chargeIds?: string[] },
): Promise<SendResponse> {
  const input = await loadSendInput(db, query.mode);
  if (query.personId) assertInToList(input, query.personId);
  return buildSend(input, { personId: query.personId ?? null, tapped: query.chargeIds ?? null });
}

/**
 * The nudge sheet again with a changed set of ticked charges. Nothing is stored.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param values - Who is picked and the ticked charge ids. Ids that are not the person's overdue
 * charges are left out.
 * @returns The sheet.
 * @throws {ApiError} 404 `no_month` or `no_person`, as `getSendSheet`.
 */
export async function previewNudge(
  db: SendDb,
  values: { personId: string; chargeIds: string[] },
): Promise<SendResponse> {
  const input = await loadSendInput(db, "nudge");
  assertInToList(input, values.personId);
  return buildSend(input, { personId: values.personId, ticked: values.chargeIds });
}
