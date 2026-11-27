import { parseHouseholdConfig, type MessageEventResponse, type SendEventRequest } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import type { BreakdownCharge } from "@/lib/messages/build-breakdown";
import { renderMonthlyMessage, renderNudgeMessage } from "@/lib/messages/render";
import { now } from "@/lib/now";
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
} as const;

const PERSON_SELECT = { id: true, name: true, isOwner: true } as const;

const EVENT_SELECT = { id: true, kind: true, chargeId: true, openedAt: true } as const;

/** A charge the person pays, as much of it as the message renderers read. */
type SendEventCharge = BreakdownCharge & { id: string };

/** The charges a person pays: the month's and earlier months' unpaid corrections, their own or paid through them. */
interface SendEventChargesWhere {
  AND: [
    { OR: [{ month: string }, { month: { lt: string }; category: "CORRECTION"; paidCents: null }] },
    { OR: [{ personId: string; payViaPersonId: null }, { payViaPersonId: string }] },
  ];
}

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface SendEventDb extends MessageTemplatesDb {
  month: {
    findUnique(args: {
      where: { month: string };
      select: { householdVersion: { select: { schemaVersion: true; config: true } } };
    }): Promise<{ householdVersion: { schemaVersion: number; config: unknown } } | null>;
  };
  person: {
    findMany(args: { select: typeof PERSON_SELECT }): Promise<{ id: string; name: string; isOwner: boolean }[]>;
  };
  bill: {
    findUnique(args: {
      where: { month: string };
      select: { currentChargesCents: true };
    }): Promise<{ currentChargesCents: number } | null>;
  };
  charge: {
    findMany(args: { where: SendEventChargesWhere; select: typeof CHARGE_SELECT }): Promise<SendEventCharge[]>;
  };
  messageEvent: {
    createManyAndReturn(args: {
      data: {
        month: string;
        personId: string;
        kind: "MONTHLY" | "NUDGE";
        chargeId: string | null;
        renderedText: string;
        openedAt: Date;
      }[];
      select: typeof EVENT_SELECT;
    }): Promise<{ id: string; kind: "MONTHLY" | "NUDGE"; chargeId: string | null; openedAt: Date }[]>;
  };
}

/**
 * Records that a message went out on WhatsApp, once the owner confirmed it was sent. The server renders the text
 * itself, with the same renderers as the Send message sheet, and stores it. A nudge about several charges stores
 * one NUDGE event per charge, each with the whole nudge's text and the same time, in one statement.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param values - MONTHLY, or NUDGE with the charges it is about, for a month and a person.
 * @returns The recorded events.
 * @throws {ApiError} 404 `no_month` when the month is not open; 404 `no_person` for an unknown person, the owner,
 * or someone not in the month's household version; 409 `no_bill` for a monthly message before the month's bill is
 * saved; 404 `no_charge` for a nudge naming a charge the person does not pay (this month's, or an earlier month's
 * unpaid correction).
 */
export async function createSendEvent(db: SendEventDb, values: SendEventRequest): Promise<MessageEventResponse> {
  const { month, personId } = values;
  const [opened, people, bill, charges, templates] = await Promise.all([
    db.month.findUnique({
      where: { month },
      select: { householdVersion: { select: { schemaVersion: true, config: true } } },
    }),
    db.person.findMany({ select: PERSON_SELECT }),
    db.bill.findUnique({ where: { month }, select: { currentChargesCents: true } }),
    db.charge.findMany({
      where: {
        AND: [
          { OR: [{ month }, { month: { lt: month }, category: "CORRECTION", paidCents: null }] },
          { OR: [{ personId, payViaPersonId: null }, { payViaPersonId: personId }] },
        ],
      },
      select: CHARGE_SELECT,
    }),
    readMessageTemplates(db),
  ]);
  if (!opened) throw new ApiError(404, "no_month", "This month isn’t open.");

  const config = parseHouseholdConfig(opened.householdVersion.schemaVersion, opened.householdVersion.config);
  const person = people.find((p) => p.id === personId);
  const inMonth = config.people.some((p) => p.personId === personId && p.role !== "OWNER");
  if (!person || person.isOwner || !inMonth) {
    throw new ApiError(404, "no_person", "That person isn’t in this month’s household.");
  }
  const names = people.map((p) => ({ id: p.id, name: p.name }));

  let chargeIds: (string | null)[];
  let renderedText: string;
  if (values.kind === "MONTHLY") {
    if (!bill) throw new ApiError(409, "no_bill", "Upload this month’s bill before sending.");
    chargeIds = [null];
    renderedText = renderMonthlyMessage({
      month,
      recipientId: person.id,
      recipientName: person.name,
      config,
      templates,
      billCents: bill.currentChargesCents,
      people: names,
      charges,
    }).text;
  } else {
    const nudged = values.chargeIds.map((id) => charges.find((c) => c.id === id));
    if (nudged.some((c) => !c)) throw new ApiError(404, "no_charge", "That charge isn’t one of theirs.");
    chargeIds = values.chargeIds;
    renderedText = renderNudgeMessage({
      recipientId: person.id,
      recipientName: person.name,
      month,
      config,
      templates,
      people: names,
      charges: nudged.filter((c) => c !== undefined),
    }).text;
  }

  const openedAt = now();
  const events = await db.messageEvent.createManyAndReturn({
    data: chargeIds.map((chargeId) => ({ month, personId, kind: values.kind, chargeId, renderedText, openedAt })),
    select: EVENT_SELECT,
  });
  return { events: events.map((e) => ({ ...e, openedAt: e.openedAt.toISOString() })) };
}
