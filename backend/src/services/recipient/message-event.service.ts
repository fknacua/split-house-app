import type { CreateMessageEventRequest, MessageEventResponse } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { renderNudgeMessage } from "@/lib/messages/render";
import { now } from "@/lib/now";
import { recipientMonthlyMessage } from "@/lib/recipient/build-recipient";
import { loadRecipientInput, type RecipientDb } from "./recipient.service";

const EVENT_SELECT = { id: true, kind: true, chargeId: true, openedAt: true } as const;

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface MessageEventDb extends RecipientDb {
  messageEvent: RecipientDb["messageEvent"] & {
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
 * Records that Francis opened a person's WhatsApp chat. The app cannot know whether the message was
 * sent, so this stores the open. The server renders the text itself from the same data as the
 * preview and stores it. A nudge about several charges stores one NUDGE event per charge, each with
 * the whole nudge's text and the same time, in one statement.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param month - The month key, e.g. `2026-11`.
 * @param personId - Whose chat was opened.
 * @param values - MONTHLY, or NUDGE with the charges it is about.
 * @returns The recorded events.
 * @throws {ApiError} 404 `no_month` or `no_person`, as `loadRecipientInput`; 409 `no_bill` for a
 * monthly message before the month's bill is saved; 404 `no_charge` for a nudge naming a charge the
 * person does not pay (this month's, or an earlier month's unpaid correction).
 */
export async function createMessageEvent(
  db: MessageEventDb,
  month: string,
  personId: string,
  values: CreateMessageEventRequest,
): Promise<MessageEventResponse> {
  const input = await loadRecipientInput(db, month, personId);

  let chargeIds: (string | null)[];
  let renderedText: string;
  if (values.kind === "MONTHLY") {
    if (input.billCents === null) throw new ApiError(409, "no_bill", "Upload this month’s bill before sending.");
    chargeIds = [null];
    renderedText = recipientMonthlyMessage(input).text;
  } else {
    const charges = values.chargeIds.map((id) => input.charges.find((c) => c.id === id));
    if (charges.some((c) => !c)) throw new ApiError(404, "no_charge", "That charge isn’t one of theirs.");
    chargeIds = values.chargeIds;
    renderedText = renderNudgeMessage({
      recipientId: input.person.id,
      recipientName: input.person.name,
      month,
      config: input.config,
      templates: input.templates,
      people: input.people,
      charges: charges.filter((c) => c !== undefined),
    }).text;
  }

  const openedAt = now();
  const events = await db.messageEvent.createManyAndReturn({
    data: chargeIds.map((chargeId) => ({ month, personId, kind: values.kind, chargeId, renderedText, openedAt })),
    select: EVENT_SELECT,
  });
  return { events: events.map((e) => ({ ...e, openedAt: e.openedAt.toISOString() })) };
}
