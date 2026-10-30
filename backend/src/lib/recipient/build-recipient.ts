import {
  CHARGE_TYPES,
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
  /** Who the screen is for: a person in `config` who is not the owner. */
  person: { id: string; name: string };
  /** Everyone, for names in the sub line and the message. */
  people: { id: string; name: string }[];
  /** The month's saved bill's Current Charges; null before the bill is saved. */
  billCents: number | null;
  /** The month's charges and earlier months' unpaid corrections that the person pays. */
  charges: RecipientChargeRow[];
  /** The person's message events for the month. The sent and nudged layouts (7.7, 7.8) read them. */
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
 * Builds one person's Recipient screen. Built so far: `notSent` (no monthly message opened yet),
 * which before the bill is saved previews the charges so far with Send and Share bill disabled.
 * The sent, nudged and paid layouts come in 7.7 to 7.9; until then every person shows `notSent`.
 *
 * @param input - The month, today, config, person, people, bill, charges and message events.
 * @returns The Recipient response.
 */
export function buildRecipient(input: RecipientInput): RecipientResponse {
  const { month, person } = input;
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const message = renderMonthlyMessage({
    month,
    recipientId: person.id,
    recipientName: person.name,
    config: input.config,
    billCents: input.billCents,
    people: input.people,
    charges: input.charges,
  });
  const hasBill = input.billCents !== null;

  const editTemplate: RecipientAction = {
    label: "Edit template",
    icon: null,
    enabled: true,
    target: { kind: "edit-template", template: "MONTHLY" },
  };

  return {
    month,
    personId: person.id,
    header: { name: person.name, sub: recipientSubLine(input.config, person.id, names) },
    amountCard: notSentAmountCard(input, message, names),
    charges: [],
    message: {
      label: "Message",
      meta: "Monthly breakdown template",
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
    note: null,
    primaryAction: {
      label: "Send on WhatsApp",
      icon: "send",
      enabled: hasBill,
      target: { kind: "send-whatsapp", month, personId: person.id },
    },
    secondaryActions: [{ label: "Share bill", icon: null, enabled: hasBill, target: { kind: "share-bill", month } }],
  };
}
