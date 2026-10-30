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
    create(args: {
      data: {
        month: string;
        personId: string;
        kind: "MONTHLY" | "NUDGE";
        chargeId: string | null;
        renderedText: string;
        openedAt: Date;
      };
      select: typeof EVENT_SELECT;
    }): Promise<{ id: string; kind: "MONTHLY" | "NUDGE"; chargeId: string | null; openedAt: Date }>;
  };
}

/**
 * Records that Francis opened a person's WhatsApp chat. The app cannot know whether the message was
 * sent, so this stores the open. The server renders the text itself from the same data as the
 * Recipient preview and stores it.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param month - The month key, e.g. `2026-11`.
 * @param personId - Whose chat was opened.
 * @param values - MONTHLY, or NUDGE with the charge it is about.
 * @returns The recorded event.
 * @throws {ApiError} 404 `no_month` or `no_person`, as `loadRecipientInput`; 409 `no_bill` for a
 * monthly message before the month's bill is saved; 404 `no_charge` for a nudge about a charge of
 * the month that the person does not pay.
 */
export async function createMessageEvent(
  db: MessageEventDb,
  month: string,
  personId: string,
  values: CreateMessageEventRequest,
): Promise<MessageEventResponse> {
  const input = await loadRecipientInput(db, month, personId);

  let chargeId: string | null = null;
  let renderedText: string;
  if (values.kind === "MONTHLY") {
    if (input.billCents === null) throw new ApiError(409, "no_bill", "Upload this month’s bill before sending.");
    renderedText = recipientMonthlyMessage(input).text;
  } else {
    const charge = input.charges.find((c) => c.id === values.chargeId && c.month === month);
    if (!charge) throw new ApiError(404, "no_charge", "That charge isn’t one of theirs this month.");
    chargeId = charge.id;
    renderedText = renderNudgeMessage({
      recipientId: input.person.id,
      recipientName: input.person.name,
      config: input.config,
      charge,
    });
  }

  const event = await db.messageEvent.create({
    data: { month, personId, kind: values.kind, chargeId, renderedText, openedAt: now() },
    select: EVENT_SELECT,
  });
  return { ...event, openedAt: event.openedAt.toISOString() };
}
