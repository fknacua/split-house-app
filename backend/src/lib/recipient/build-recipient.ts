import {
  CHARGE_TYPES,
  dateKeyOf,
  formatCents,
  formatDateShort,
  formatMonthShortLabel,
  type ChargeType,
  type HouseholdConfig,
  type RecipientAction,
  type RecipientAmountCard,
  type RecipientResponse,
} from "@splithouse/shared";
import type { MessageKind } from "@/generated/prisma/enums";
import { HOME_BADGES } from "@/lib/home/badges";
import type { BreakdownCharge } from "@/lib/messages/build-breakdown";
import { renderMonthlyMessage, type MonthlyMessage } from "@/lib/messages/render";
import { whatsappLink } from "@/lib/messages/whatsapp-link";

/** A charge row, as much of it as Recipient needs. */
export type RecipientChargeRow = BreakdownCharge & { id: string };

/** A message event of the person's, for the month. */
export interface RecipientMessageEvent {
  kind: MessageKind;
  chargeId: string | null;
  openedAt: Date;
}

/** What `buildRecipient` reads. */
export interface RecipientInput {
  /** `YYYY-MM`. */
  month: string;
  /** Today's date key in Asia/Singapore. */
  today: string;
  /** The config pinned to `month`. */
  config: HouseholdConfig;
  /** Who the screen is for: a person in `config` who is not the owner. `whatsappE164` is null without a number. */
  person: { id: string; name: string; whatsappE164: string | null };
  /** Everyone, for names in the sub line and the message. */
  people: { id: string; name: string }[];
  /** The month's saved bill's Current Charges; null before the bill is saved. */
  billCents: number | null;
  /** The month's charges and earlier months' unpaid corrections that the person pays. */
  charges: RecipientChargeRow[];
  /** The person's message events for the month. The latest MONTHLY one makes the layout `sent`. */
  messages: RecipientMessageEvent[];
}

// How a charge type reads in the sub line, e.g. "utilities and aircon via Priya".
const ROUTE_WORDS: Record<ChargeType, string> = {
  RENT: "rent",
  UTILITIES: "utilities",
  AIRCON: "aircon",
  RECURRING: "other charges",
};

/** `a`, `a and b`, `a, b and c`. */
function joinWords(words: string[]): string {
  return words.length <= 1 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

/**
 * The header's sub line from the config: the room from the role, then how they pay.
 *
 * @param config - The config pinned to the month.
 * @param personId - The person.
 * @param names - Names by person id.
 * @returns e.g. `Master room · pays you directly` or `Own room · utilities and aircon via Priya`.
 */
export function recipientSubLine(config: HouseholdConfig, personId: string, names: Map<string, string>): string {
  const person = config.people.find((p) => p.personId === personId);
  const room = person?.role === "PRIMARY" ? "Master room" : "Own room";
  const viaTypes = new Map<string, ChargeType[]>();
  for (const type of CHARGE_TYPES) {
    const route = person?.routes[type];
    if (route?.kind === "VIA") viaTypes.set(route.viaPersonId, [...(viaTypes.get(route.viaPersonId) ?? []), type]);
  }
  if (viaTypes.size === 0) return `${room} · pays you directly`;
  const routes = [...viaTypes].map(
    ([viaId, types]) => `${joinWords(types.map((t) => ROUTE_WORDS[t]))} via ${names.get(viaId) ?? "someone"}`,
  );
  return `${room} · ${routes.join(", ")}`;
}

/**
 * The amount card before the monthly message is opened. Before the bill is saved it shows what is
 * there so far; after, the total with the earliest due date and whose share rides in the message.
 */
function notSentAmountCard(input: RecipientInput, message: MonthlyMessage, names: Map<string, string>): RecipientAmountCard {
  const monthLabel = formatMonthShortLabel(input.month);
  const amount = formatCents(message.breakdown.totalCents);
  if (input.billCents === null) {
    return {
      label: `${monthLabel} so far`,
      amount,
      chip: HOME_BADGES.needsBill,
      statusLine: { text: "Utilities are worked out once the bill is uploaded", tone: "default" },
    };
  }

  const { dueDate } = message.breakdown;
  const overdue = dueDate !== null && dueDate < input.today;
  const parts: string[] = [];
  if (dueDate) parts.push(overdue ? `Overdue since ${formatDateShort(dueDate)}` : `Due ${formatDateShort(dueDate)}`);
  const others = message.breakdown.sections
    .filter((s) => s.personId !== input.person.id)
    .map((s) => `${names.get(s.personId) ?? "Someone"}’s`);
  if (others.length > 0) parts.push(`includes ${joinWords(others)} ${others.length === 1 ? "share" : "shares"}`);

  return {
    label: `${monthLabel} total`,
    amount,
    chip: HOME_BADGES.notSent,
    statusLine: parts.length > 0 ? { text: parts.join(" · "), tone: overdue ? "danger" : "default" } : null,
  };
}

/**
 * The amount card once the monthly message was opened: when it went out and when it is due.
 *
 * @param sentOn - The date key of the latest monthly message.
 */
function sentAmountCard(input: RecipientInput, message: MonthlyMessage, sentOn: string): RecipientAmountCard {
  const { dueDate } = message.breakdown;
  const overdue = dueDate !== null && dueDate < input.today;
  const parts = [`Sent ${formatDateShort(sentOn)}`];
  if (dueDate) parts.push(overdue ? `overdue since ${formatDateShort(dueDate)}` : `due ${formatDateShort(dueDate)}`);
  return {
    label: `${formatMonthShortLabel(input.month)} total`,
    amount: formatCents(message.breakdown.totalCents),
    chip: HOME_BADGES.recipientSentUnpaid,
    statusLine: { text: parts.join(" · "), tone: overdue ? "danger" : "default" },
  };
}

/**
 * The person's monthly message for the month, as previewed, sent and recorded.
 *
 * @param input - The Recipient input.
 * @returns The rendered monthly message.
 */
export function recipientMonthlyMessage(input: RecipientInput): MonthlyMessage {
  return renderMonthlyMessage({
    month: input.month,
    recipientId: input.person.id,
    recipientName: input.person.name,
    config: input.config,
    billCents: input.billCents,
    people: input.people,
    charges: input.charges,
  });
}

/** The date key of the latest MONTHLY message event, or null when none was opened. */
function lastSentOn(messages: RecipientMessageEvent[]): string | null {
  const times = messages.filter((m) => m.kind === "MONTHLY").map((m) => m.openedAt.getTime());
  return times.length > 0 ? dateKeyOf(new Date(Math.max(...times))) : null;
}

/**
 * Builds one person's Recipient screen. Built so far: `notSent` (no monthly message opened yet),
 * which before the bill is saved previews the charges so far with Send and Share bill disabled, and
 * `sent` (a monthly message opened), with Mark paid, Share bill and Send again. The nudged and paid
 * layouts come in 7.8 and 7.9; until then those people show `sent` or `notSent`. Send is disabled
 * when the person has no WhatsApp number.
 *
 * @param input - The month, today, config, person, people, bill, charges and message events.
 * @returns The Recipient response.
 */
export function buildRecipient(input: RecipientInput): RecipientResponse {
  const { month, person } = input;
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const message = recipientMonthlyMessage(input);
  const hasBill = input.billCents !== null;
  const sentOn = lastSentOn(input.messages);
  const url = person.whatsappE164 ? whatsappLink(person.whatsappE164, message.text) : null;

  const editTemplate: RecipientAction = {
    label: "Edit template",
    icon: null,
    enabled: true,
    target: { kind: "edit-template", template: "MONTHLY" },
  };
  const shareBill: RecipientAction = { label: "Share bill", icon: null, enabled: hasBill, target: { kind: "share-bill", month } };
  const send = (label: string, icon: RecipientAction["icon"]): RecipientAction => ({
    label,
    icon,
    enabled: hasBill && url !== null,
    target: { kind: "send-whatsapp", month, personId: person.id, url },
  });

  return {
    month,
    personId: person.id,
    header: { name: person.name, sub: recipientSubLine(input.config, person.id, names) },
    amountCard: sentOn ? sentAmountCard(input, message, sentOn) : notSentAmountCard(input, message, names),
    charges: [],
    message: {
      label: sentOn ? "Sent message" : "Message",
      meta: sentOn ? `Sent ${formatDateShort(sentOn)}` : "Monthly breakdown template",
      intro: message.before,
      sections: message.breakdown.sections.map((s) => ({
        title: s.title,
        lines: s.lines.map((l) => ({ label: l.label, amount: l.amount })),
        subtotal: s.subtotal,
      })),
      outro: message.afterLines,
      text: message.text,
      editTemplate,
    },
    // Says why Send on WhatsApp and Send again are disabled.
    note: url === null ? `No WhatsApp number is set up for ${person.name}.` : null,
    primaryAction: sentOn
      ? { label: "Mark paid", icon: "check", enabled: true, target: { kind: "record-payment", month, personId: person.id } }
      : send("Send on WhatsApp", "send"),
    secondaryActions: sentOn ? [shareBill, send("Send again", null)] : [shareBill],
  };
}
