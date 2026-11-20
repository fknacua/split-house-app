import {
  dateKeyOf,
  daysUntil,
  formatCents,
  formatDateShort,
  formatMonthShort,
  formatMonthShortLabel,
  type HouseholdConfig,
  type MessageTemplates,
  type SendChargesCard,
  type SendHistory,
  type SendMessageCard,
  type SendMode,
  type SendResponse,
  type SendToOption,
  type SendTotalCard,
  type SendWhatsappTarget,
} from "@splithouse/shared";
import type { ChargeCategory, MessageKind } from "@/generated/prisma/enums";
import { HOME_BADGES, overdueBadge } from "@/lib/home/badges";
import { chargeDueDate } from "@/lib/home/due-dates";
import { messageRecipientIds } from "@/lib/home/message-recipients";
import { joinWords } from "@/lib/household/sub-line";
import { breakdownCharges, type BreakdownCharge } from "@/lib/messages/build-breakdown";
import {
  monthlyMessagePreview,
  nudgeMessagePreview,
  renderMonthlyMessage,
  renderNudgeMessage,
} from "@/lib/messages/render";
import { whatsappLink } from "@/lib/messages/whatsapp-link";

/** A charge row, as much of it as the sheet needs. */
export type SendCharge = BreakdownCharge & { id: string };

/** A message event of the active month. */
export interface SendMessageEvent {
  personId: string;
  kind: MessageKind;
  chargeId: string | null;
  openedAt: Date;
}

/** What the Send message sheet is built from: the whole household's active month. */
export interface SendInput {
  mode: SendMode;
  /** The active month, `YYYY-MM`. */
  month: string;
  /** Today's date key in Asia/Singapore. */
  today: string;
  /** The config pinned to `month`. */
  config: HouseholdConfig;
  /** The current wording. */
  templates: MessageTemplates;
  /** Everyone; `whatsappE164` is null without a number. */
  people: { id: string; name: string; whatsappE164: string | null }[];
  /** The month's saved bill's Current Charges; null before the bill is saved. */
  billCents: number | null;
  /** Everyone's charges for the month, and earlier months' unpaid corrections. */
  charges: SendCharge[];
  /** Everyone's message events for the month. */
  messages: SendMessageEvent[];
}

/** Who is picked and what is ticked. */
export interface SendPick {
  /** One of `sendToOptions`'s people, or null for nobody. */
  personId: string | null;
  /** Nudge mode: the charge that was tapped, ticked when `ticked` is null and it is overdue. */
  tapped?: string | null;
  /** Nudge mode: the ticked charge ids, from a preview; null for the opening tick. */
  ticked?: string[] | null;
}

/** An overdue charge with its due date. */
interface Overdue {
  charge: SendCharge;
  dueDate: string;
}

// Proposed copy (not drawn): the To field before anyone is picked.
const TO_PLACEHOLDER = "Choose a person";

// Charges due on the same day go: rent, recurring, utilities, aircon, then the rest.
const CATEGORY_RANK: Partial<Record<ChargeCategory, number>> = { RENT: 0, RECURRING: 1, UTILITIES: 2, AIRCON: 3 };

/** Orders overdue charges by due date, then rent, recurring, utilities, aircon and the rest. */
function byDueDate(a: Overdue, b: Overdue): number {
  return (
    a.dueDate.localeCompare(b.dueDate) ||
    (CATEGORY_RANK[a.charge.category] ?? 4) - (CATEGORY_RANK[b.charge.category] ?? 4)
  );
}

/** The person's MONTHLY events, oldest first. */
function monthlyEvents(input: SendInput, personId: string): SendMessageEvent[] {
  return input.messages
    .filter((m) => m.personId === personId && m.kind === "MONTHLY")
    .sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
}

/**
 * The charges a nudge to the person can list: the unpaid charges above zero in their monthly
 * breakdown (their own and those they collect, this month's and earlier months' corrections) that
 * are past their due date. None until their monthly message has gone out, since a nudge follows it.
 */
function overdueCharges(input: SendInput, personId: string): Overdue[] {
  if (monthlyEvents(input, personId).length === 0) return [];
  return breakdownCharges(input.charges, input.month, personId)
    .filter((c) => c.amountCents > 0)
    .map((charge) => ({ charge, dueDate: chargeDueDate(charge.month, input.config, charge) }))
    .filter((o): o is Overdue => o.dueDate !== null && o.dueDate < input.today)
    .sort(byDueDate);
}

/** `Rent · Nov`, or `Utilities · Sam · Nov` for a charge collected through the person. */
function chargeTitle(charge: SendCharge, names: Map<string, string>): string {
  const parts = [charge.label];
  if (charge.payViaPersonId) parts.push(names.get(charge.personId) ?? "Someone");
  parts.push(formatMonthShort(charge.month));
  return parts.join(" · ");
}

/** The household's people who are not owners, in the config's order. */
function tenantIds(config: HouseholdConfig): string[] {
  return config.people.filter((p) => p.role !== "OWNER").map((p) => p.personId);
}

/**
 * The To list. Monthly mode: everyone who gets a monthly message (whoever pays a utilities charge),
 * with when it last went out. Nudge mode: everyone with an overdue charge after their monthly message
 * went out, with the count and the amount. Someone who pays via another person is in neither, since
 * their charges ride in that person's message.
 *
 * @param input - The active month's household.
 * @returns The people, in the household's order.
 */
export function sendToOptions(input: SendInput): SendToOption[] {
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const tenants = tenantIds(input.config);
  const owners = new Set(input.config.people.filter((p) => p.role === "OWNER").map((p) => p.personId));

  if (input.mode === "monthly") {
    const monthCharges = input.charges.filter((c) => c.month === input.month);
    const recipients = new Set(messageRecipientIds(monthCharges, owners));
    return tenants
      .filter((id) => recipients.has(id) && !owners.has(id))
      .map((id) => {
        const last = monthlyEvents(input, id).at(-1);
        return {
          personId: id,
          name: names.get(id) ?? "Someone",
          detail: last ? `Sent ${formatDateShort(dateKeyOf(last.openedAt))}` : "Monthly message not sent",
          tone: "default",
        };
      });
  }

  return tenants.flatMap((id): SendToOption[] => {
    const overdue = overdueCharges(input, id);
    if (overdue.length === 0) return [];
    const cents = overdue.reduce((sum, o) => sum + o.charge.amountCents, 0);
    return [
      {
        personId: id,
        name: names.get(id) ?? "Someone",
        detail: `${overdue.length} overdue · ${formatCents(cents)}`,
        tone: "danger",
      },
    ];
  });
}

/** The person's custom template of the kind when they have one, else the Default. */
function editTemplate(templates: MessageTemplates, personId: string, template: MessageKind): SendMessageCard["editTemplate"] {
  const own = templates.overrides.some((o) => o.personId === personId && o.kind === template);
  return { label: "Edit template", target: own ? { kind: "edit-template", template, personId } : { kind: "edit-template", template } };
}

/** `Sent` then `Sent again`, or `Nudged` then `Nudged again`, one row per date-stamped send, oldest first. */
function historyRows(times: Date[], first: string, again: string): SendHistory["rows"] {
  return times.map((t, i) => ({ label: i === 0 ? first : again, date: formatDateShort(dateKeyOf(t)) }));
}

/** The person, as the picked one needs: their name and number. */
type Person = SendInput["people"][number];

/** What the picked person's half of the sheet holds, by mode. */
interface PickedParts {
  total: SendTotalCard | null;
  charges: SendChargesCard | null;
  history: SendHistory | null;
  message: SendMessageCard;
  /** The message text to send; null when there is nothing to send yet. */
  text: string | null;
  /** What to record once the send is confirmed, without the month and person `buildSend` adds. */
  record: { kind: "MONTHLY" } | { kind: "NUDGE"; chargeIds: string[] } | null;
}

/** Monthly mode: the Total card, the sent history and the breakdown message. */
function monthlyParts(input: SendInput, person: Person, names: Map<string, string>): PickedParts {
  const message = renderMonthlyMessage({
    month: input.month,
    recipientId: person.id,
    recipientName: person.name,
    config: input.config,
    templates: input.templates,
    billCents: input.billCents,
    people: input.people.map((p) => ({ id: p.id, name: p.name })),
    charges: input.charges,
  });
  const included = breakdownCharges(input.charges, input.month, person.id);
  const sent = monthlyEvents(input, person.id);

  const owed = input.charges.filter(
    (c) => (c.payViaPersonId ?? c.personId) === person.id && c.month === input.month && c.amountCents > 0,
  );
  const allPaid = owed.length > 0 && owed.every((c) => c.paidCents !== null);
  const sub = [`${included.length} ${included.length === 1 ? "charge" : "charges"}`];
  if (message.breakdown.dueDate) sub.push(`due ${formatDateShort(message.breakdown.dueDate)}`);
  const collected = message.breakdown.sections
    .filter((s) => s.personId !== person.id)
    .map((s) => names.get(s.personId) ?? "Someone");

  return {
    total: {
      amount: formatCents(message.breakdown.totalCents),
      sub: sub.join(" · "),
      paysFor: collected.length > 0 ? `Pays for: ${joinWords(collected)}` : null,
      chip: allPaid ? HOME_BADGES.paid : sent.length > 0 ? HOME_BADGES.sentUnpaid : HOME_BADGES.notSent,
      rows: [...included]
        .sort(
          (a, b) =>
            Number(a.personId !== person.id) - Number(b.personId !== person.id) || b.amountCents - a.amountCents,
        )
        .map((c) => ({ title: chargeTitle(c, names), amount: formatCents(c.amountCents) })),
    },
    charges: null,
    history: sent.length > 0 ? { title: "Sent", rows: historyRows(sent.map((m) => m.openedAt), "Sent", "Sent again") } : null,
    message: {
      label: "Message",
      meta: "Monthly breakdown template",
      preview: monthlyMessagePreview(message),
      empty: null,
      editTemplate: editTemplate(input.templates, person.id, "MONTHLY"),
    },
    // A monthly message waits for the bill, as the send events endpoint does.
    text: input.billCents === null ? null : message.text,
    record: { kind: "MONTHLY" },
  };
}

/** Nudge mode: the overdue charges with their ticks, the nudges about the ticked ones and the nudge message. */
function nudgeParts(input: SendInput, person: Person, pick: SendPick, names: Map<string, string>): PickedParts {
  const overdue = overdueCharges(input, person.id);
  const opening = overdue.find((o) => o.charge.id === pick.tapped) ?? overdue[0];
  const tickedIds = new Set(pick.ticked ?? (opening ? [opening.charge.id] : []));
  const ticked = overdue.filter((o) => tickedIds.has(o.charge.id));
  const cents = ticked.reduce((sum, o) => sum + o.charge.amountCents, 0);
  const several = overdue.length > 1;

  // A nudge about several charges records one event per charge at the same moment: one send.
  const sends = new Map<number, Date>();
  for (const m of input.messages) {
    if (m.personId === person.id && m.kind === "NUDGE" && m.chargeId && tickedIds.has(m.chargeId)) {
      sends.set(m.openedAt.getTime(), m.openedAt);
    }
  }
  const times = [...sends.values()].sort((a, b) => a.getTime() - b.getTime());

  let sub: string;
  if (ticked.length === 0) sub = "No charge selected";
  else if (ticked.length === 1) sub = chargeTitle(ticked[0].charge, names);
  else sub = `${ticked.length} charges`;

  const nudge =
    ticked.length > 0
      ? renderNudgeMessage({
          recipientId: person.id,
          recipientName: person.name,
          month: input.month,
          config: input.config,
          templates: input.templates,
          people: input.people.map((p) => ({ id: p.id, name: p.name })),
          charges: ticked.map((o) => o.charge),
        })
      : null;

  return {
    total: null,
    charges: {
      label: several ? "Overdue charges" : "Charge",
      amount: formatCents(cents),
      sub,
      selected: several ? `${ticked.length} of ${overdue.length} overdue selected` : null,
      chip: ticked.length > 0 ? overdueBadge(-daysUntil(ticked[0].dueDate, input.today)) : null,
      expandable: several,
      rows: overdue.map((o) => ({
        chargeId: o.charge.id,
        title: chargeTitle(o.charge, names),
        amount: formatCents(o.charge.amountCents),
        detail: `Due ${formatDateShort(o.dueDate)}`,
        chip: overdueBadge(-daysUntil(o.dueDate, input.today)),
        ticked: tickedIds.has(o.charge.id),
      })),
    },
    history: times.length > 0 ? { title: "Nudges", rows: historyRows(times, "Nudged", "Nudged again") } : null,
    message: {
      label: "Message",
      meta: "Nudge template",
      preview: nudge ? nudgeMessagePreview(nudge) : null,
      empty: nudge ? null : "Pick at least one charge to see the message.",
      editTemplate: editTemplate(input.templates, person.id, "NUDGE"),
    },
    text: nudge?.text ?? null,
    record: ticked.length > 0 ? { kind: "NUDGE", chargeIds: ticked.map((o) => o.charge.id) } : null,
  };
}

/**
 * Builds the Send message sheet (`SendMessageV2`) for the active month, in monthly or nudge mode. With
 * nobody picked it holds only the To list and the footer. Monthly mode shows the person's Total, the
 * dates their message went out and their breakdown; nudge mode shows their overdue charges with the
 * ticked ones (the tapped charge, else the earliest due, when the sheet opens), the dates of nudges
 * about the ticked ones, and the nudge listing them. Send opens WhatsApp and says what to record; it
 * can't be used without a WhatsApp number, before the bill (monthly) or with nothing ticked (nudge).
 *
 * @param input - The active month's household, charges and message events.
 * @param pick - Who is picked (one of `sendToOptions`'s, or null) and, in nudge mode, what is ticked.
 * @returns The sheet.
 */
export function buildSend(input: SendInput, pick: SendPick): SendResponse {
  const { month, mode } = input;
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const person = pick.personId ? input.people.find((p) => p.id === pick.personId) ?? null : null;
  const shell = {
    mode,
    month,
    title: mode === "nudge" ? "Send nudge message" : "Send message",
    subtitle: formatMonthShortLabel(month),
    to: { personId: person?.id ?? null, placeholder: TO_PLACEHOLDER, options: sendToOptions(input) },
    shareBill: {
      label: "Share bill",
      enabled: input.billCents !== null,
      target: { kind: "share-bill" as const, month },
    },
  };
  if (!person) {
    return {
      ...shell,
      total: null,
      charges: null,
      history: null,
      message: null,
      note: null,
      send: { label: "Send on WhatsApp", target: null },
    };
  }

  const parts = mode === "monthly" ? monthlyParts(input, person, names) : nudgeParts(input, person, pick, names);
  const again = mode === "monthly" ? "Send again" : "Nudge again";
  const target: SendWhatsappTarget | null =
    person.whatsappE164 && parts.text !== null && parts.record
      ? {
          kind: "send-whatsapp",
          url: whatsappLink(person.whatsappE164, parts.text),
          record: { ...parts.record, month, personId: person.id },
        }
      : null;

  return {
    ...shell,
    total: parts.total,
    charges: parts.charges,
    history: parts.history,
    message: parts.message,
    note: person.whatsappE164 ? null : `No WhatsApp number is set up for ${person.name}.`,
    send: { label: parts.history ? again : "Send on WhatsApp", target },
  };
}
