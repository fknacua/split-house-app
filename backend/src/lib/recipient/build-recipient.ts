import {
  CHARGE_TYPES,
  dateKeyOf,
  daysUntil,
  formatCents,
  formatDateShort,
  formatMonthName,
  formatMonthShortLabel,
  formatPaymentDifference,
  type ChargeType,
  type HouseholdConfig,
  type RecipientAction,
  type RecipientAmountCard,
  type RecipientChargeRow as RecipientChargeRowView,
  type RecipientNudgeTarget,
  type RecipientPaidCharge,
  type RecipientResponse,
} from "@splithouse/shared";
import type { ChargeCategory, MessageKind } from "@/generated/prisma/enums";
import { chargeBadge, HOME_BADGES } from "@/lib/home/badges";
import { chargeDueDate } from "@/lib/home/due-dates";
import type { BreakdownCharge } from "@/lib/messages/build-breakdown";
import { renderMonthlyMessage, renderNudgeMessage, type MonthlyMessage } from "@/lib/messages/render";
import { whatsappLink } from "@/lib/messages/whatsapp-link";

/** A charge row, as much of it as Recipient needs. */
export type RecipientChargeRow = BreakdownCharge & { id: string; paidOn: Date | null };

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
  /** False for a month before the newest opened one, where a stored payment can't be changed. */
  paymentsEditable: boolean;
  /**
   * The charge Home's Nudge opened the screen for. Used when it is one of the person's overdue
   * charges; otherwise the earliest-due overdue charge is chosen.
   */
  chargeId?: string | null;
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
 * The amount card once the monthly message was opened: when it went out and when it is due. Nothing
 * is overdue here; that is the overdue layout.
 *
 * @param sentOn - The date key of the latest monthly message.
 */
function sentAmountCard(input: RecipientInput, message: MonthlyMessage, sentOn: string): RecipientAmountCard {
  const { dueDate } = message.breakdown;
  const parts = [`Sent ${formatDateShort(sentOn)}`];
  if (dueDate) parts.push(`due ${formatDateShort(dueDate)}`);
  return {
    label: `${formatMonthShortLabel(input.month)} total`,
    amount: formatCents(message.breakdown.totalCents),
    chip: HOME_BADGES.recipientSentUnpaid,
    statusLine: { text: parts.join(" · "), tone: "default" },
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

// Charges due on the same day go: rent, recurring, utilities, aircon, then the rest.
const CATEGORY_RANK: Partial<Record<ChargeCategory, number>> = { RENT: 0, RECURRING: 1, UTILITIES: 2, AIRCON: 3 };

/** An unpaid charge with what the overdue layout works out about it. */
interface OpenCharge {
  charge: RecipientChargeRow;
  /** e.g. `Rent`, or `Utilities · Sam` for a charge paid through the person. */
  title: string;
  /** Date key; null when no due day is known. */
  dueDate: string | null;
  overdue: boolean;
  /** Date key of the latest nudge about it, or null. */
  nudgedOn: string | null;
  /** Null unless overdue. */
  nudge: RecipientNudgeTarget | null;
}

/** The person's unpaid charges by due date, each with its nudge when overdue. */
function openCharges(input: RecipientInput, names: Map<string, string>): OpenCharge[] {
  const nudgedOn = new Map<string, string>();
  for (const m of [...input.messages].sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime())) {
    if (m.kind === "NUDGE" && m.chargeId) nudgedOn.set(m.chargeId, dateKeyOf(m.openedAt));
  }
  const { person } = input;
  return input.charges
    .filter((c) => c.paidCents === null)
    .map((charge) => {
      const dueDate = chargeDueDate(charge.month, input.config, charge);
      const overdue = dueDate !== null && dueDate < input.today;
      let nudge: RecipientNudgeTarget | null = null;
      if (overdue) {
        const text = renderNudgeMessage({ recipientId: person.id, recipientName: person.name, config: input.config, charge });
        nudge = {
          kind: "nudge-whatsapp",
          month: input.month,
          personId: person.id,
          chargeId: charge.id,
          url: person.whatsappE164 ? whatsappLink(person.whatsappE164, text) : null,
        };
      }
      return {
        charge,
        title: chargeTitle(charge, names),
        dueDate,
        overdue,
        nudgedOn: nudgedOn.get(charge.id) ?? null,
        nudge,
      };
    })
    .sort(byDueDate);
}

/** `Rent`, or `Utilities · Sam` for a charge paid through the person. */
function chargeTitle(charge: RecipientChargeRow, names: Map<string, string>): string {
  return charge.payViaPersonId ? `${charge.label} · ${names.get(charge.personId) ?? "Someone"}` : charge.label;
}

/** Orders charges by due date (none last), then rent, recurring, utilities, aircon and the rest. */
function byDueDate(
  a: { charge: RecipientChargeRow; dueDate: string | null },
  b: { charge: RecipientChargeRow; dueDate: string | null },
): number {
  return (
    (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
    (CATEGORY_RANK[a.charge.category] ?? 4) - (CATEGORY_RANK[b.charge.category] ?? 4)
  );
}

/** A charge row: Home's chip, and the due date with the latest nudge or the monthly message's date. */
function chargeRowView(open: OpenCharge, today: string, sentOn: string): RecipientChargeRowView {
  const { charge, dueDate, nudgedOn } = open;
  const parts = dueDate ? [`Due ${formatDateShort(dueDate)}`] : [];
  parts.push(nudgedOn ? `nudged ${formatDateShort(nudgedOn)}` : `sent ${formatDateShort(sentOn)}`);
  return {
    chargeId: charge.id,
    title: open.title,
    amount: formatCents(charge.amountCents),
    detail: parts.join(" · "),
    chip: chargeBadge({
      paid: false,
      messageUnsent: false,
      days: dueDate === null ? null : daysUntil(dueDate, today),
      sent: true,
    }),
    nudge: open.nudge,
  };
}

/** `Mark rent paid`, `Mark Sam’s utilities paid`, `Mark Starhub paid`. */
function markChargePaidLabel(open: OpenCharge, names: Map<string, string>): string {
  const { charge } = open;
  const fixed = charge.category === "RENT" || charge.category === "UTILITIES" || charge.category === "AIRCON";
  const what = fixed ? ROUTE_WORDS[charge.category as ChargeType] : charge.label;
  const whose = charge.payViaPersonId ? `${names.get(charge.personId) ?? "Someone"}’s ` : "";
  return `Mark ${whose}${what} paid`;
}

/**
 * The overdue layout: once the monthly message is out and a charge is past its due date. The chosen
 * charge (Home's Nudge, else the earliest due) drives the status line, the nudge in the message
 * card and Mark paid. Nudge again nudges it, or asks which when none was chosen and two or more are
 * overdue.
 */
function overdueRecipient(
  input: RecipientInput,
  message: MonthlyMessage,
  open: OpenCharge[],
  sentOn: string,
  names: Map<string, string>,
  header: RecipientResponse["header"],
): RecipientResponse {
  const { month, person } = input;
  const overdue = open.filter((o) => o.overdue);
  const picked = overdue.find((o) => o.charge.id === input.chargeId);
  const chosen = picked ?? overdue[0];
  const nudgeText = renderNudgeMessage({
    recipientId: person.id,
    recipientName: person.name,
    config: input.config,
    charge: chosen.charge,
  });
  const status = [`${chosen.title} overdue since ${formatDateShort(chosen.dueDate!)}`];
  if (chosen.nudgedOn) status.push(`nudged ${formatDateShort(chosen.nudgedOn)}`);
  const askWhich = !picked && overdue.length > 1;

  return {
    month,
    personId: person.id,
    header,
    amountCard: {
      label: "Outstanding",
      amount: formatCents(message.breakdown.totalCents),
      chip: HOME_BADGES.recipientOverdue,
      statusLine: { text: status.join(" · "), tone: "danger" },
    },
    charges: open.map((o) => chargeRowView(o, input.today, sentOn)),
    message: {
      label: chosen.nudgedOn ? "Last nudge" : "Nudge",
      meta: chosen.nudgedOn ? `Sent ${formatDateShort(chosen.nudgedOn)}` : "Nudge template",
      intro: nudgeText,
      sections: [],
      outro: [],
      text: nudgeText,
      editTemplate: { label: "Edit template", icon: null, enabled: true, target: { kind: "edit-template", template: "NUDGE" } },
    },
    allPaid: null,
    note: person.whatsappE164 ? null : `No WhatsApp number is set up for ${person.name}.`,
    primaryAction: {
      label: markChargePaidLabel(chosen, names),
      icon: "check",
      enabled: true,
      target: { kind: "record-payment", month, personId: person.id, chargeId: chosen.charge.id },
    },
    secondaryActions: [
      {
        label: chosen.nudgedOn ? "Nudge again" : "Nudge",
        icon: null,
        enabled: person.whatsappE164 !== null,
        target: askWhich ? { kind: "choose-nudge", month, personId: person.id } : chosen.nudge!,
      },
    ],
  };
}

/** `$63.65 short` or `$20.00 over` for a payment that differs from its charge; null when it matches. */
function chargeGap(charge: RecipientChargeRow): string | null {
  const paid = charge.paidCents ?? charge.amountCents;
  if (paid === charge.amountCents) return null;
  return `${formatCents(Math.abs(charge.amountCents - paid))} ${paid < charge.amountCents ? "short" : "over"}`;
}

/**
 * The paid layouts, once every charge the person pays has a payment: `paid` when the totals match,
 * `paidDifferent` when less or more came in (`Paid less` or `Paid more`, the 7.2 wording). There is
 * no message left to send, so a box stands in for it. Edit payment opens on the charge that differs
 * (else the first), with every paid charge in its For list; it is left out in an earlier month,
 * where a stored payment can't be changed. Add correction does nothing until Phase 11.
 */
function paidRecipient(input: RecipientInput, names: Map<string, string>, header: RecipientResponse["header"]): RecipientResponse {
  const { month, person } = input;
  const paid = input.charges
    .map((charge) => ({ charge, dueDate: chargeDueDate(charge.month, input.config, charge) }))
    .sort(byDueDate)
    .map((p) => p.charge);
  const expectedCents = paid.reduce((sum, c) => sum + c.amountCents, 0);
  const receivedCents = paid.reduce((sum, c) => sum + (c.paidCents ?? 0), 0);
  const lastPaidOn = formatDateShort(
    dateKeyOf(new Date(Math.max(...paid.map((c) => c.paidOn?.getTime() ?? 0)))),
  );
  const difference = formatPaymentDifference(expectedCents, receivedCents, month);
  const monthName = formatMonthName(month);

  const charges: RecipientPaidCharge[] = paid.map((c) => {
    const gap = chargeGap(c);
    const on = c.paidOn ? `Paid ${formatDateShort(dateKeyOf(c.paidOn))}` : "Paid";
    return {
      chargeId: c.id,
      title: chargeTitle(c, names),
      received: formatCents(c.paidCents ?? 0),
      detail: gap ? `${on} · ${gap}` : on,
    };
  });
  const editPayment: RecipientAction = {
    label: "Edit payment",
    icon: null,
    enabled: true,
    target: { kind: "edit-payment", chargeId: (paid.find((c) => chargeGap(c)) ?? paid[0]).id, charges },
  };

  return {
    month,
    personId: person.id,
    header,
    amountCard: difference
      ? {
          label: `Received ${lastPaidOn}`,
          amount: formatCents(receivedCents),
          chip: difference.kind === "short" ? HOME_BADGES.recipientPaidLess : HOME_BADGES.recipientPaidMore,
          statusLine: { text: difference.title, tone: difference.kind === "short" ? "warning" : "default" },
        }
      : {
          label: `${formatMonthShortLabel(month)} total`,
          amount: formatCents(expectedCents),
          chip: HOME_BADGES.paid,
          statusLine: { text: `Paid in full ${lastPaidOn}`, tone: "default" },
        },
    charges: [],
    message: null,
    allPaid: difference
      ? { title: "No messages to send", note: `Every charge for ${monthName} has a payment.` }
      : { title: "All payments done", note: `Nothing left to send for ${monthName}.` },
    note: difference?.text ?? null,
    primaryAction: difference
      ? { label: "Add correction", icon: "plus", enabled: true, target: { kind: "add-correction", month, personId: person.id } }
      : null,
    secondaryActions: input.paymentsEditable ? [editPayment] : [],
  };
}

/**
 * Builds one person's Recipient screen: `notSent` (no monthly message opened yet), which before the
 * bill is saved previews the charges so far with Send and Share bill disabled; `sent` (a monthly
 * message opened), with Mark paid, Share bill and Send again; the overdue layout (`nudged`: a
 * monthly message opened and a charge past its due date), with the charge rows, the nudge, Mark paid
 * for the chosen charge and Nudge again; and the paid layouts (`paid`, `paidDifferent`) once every
 * charge has a payment, whether or not a message went out. Sending is disabled when the person has
 * no WhatsApp number.
 *
 * @param input - The month, today, config, person, people, bill, charges, message events, whether
 * payments can still be edited, and the charge Home's Nudge chose.
 * @returns The Recipient response.
 */
export function buildRecipient(input: RecipientInput): RecipientResponse {
  const { month, person } = input;
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const header = { name: person.name, sub: recipientSubLine(input.config, person.id, names) };
  // Credits can't be marked paid yet (Phase 11), so an unpaid one doesn't hold the page back.
  const toPay = input.charges.filter((c) => c.amountCents > 0);
  if (input.billCents !== null && toPay.length > 0 && toPay.every((c) => c.paidCents !== null)) {
    return paidRecipient({ ...input, charges: toPay }, names, header);
  }
  const message = recipientMonthlyMessage(input);
  const hasBill = input.billCents !== null;
  const sentOn = lastSentOn(input.messages);
  if (sentOn) {
    const open = openCharges(input, names);
    if (open.some((o) => o.overdue)) return overdueRecipient(input, message, open, sentOn, names, header);
  }
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
    header,
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
    allPaid: null,
    // Says why Send on WhatsApp and Send again are disabled.
    note: url === null ? `No WhatsApp number is set up for ${person.name}.` : null,
    primaryAction: sentOn
      ? { label: "Mark paid", icon: "check", enabled: true, target: { kind: "record-payment", month, personId: person.id } }
      : send("Send on WhatsApp", "send"),
    secondaryActions: sentOn ? [shareBill, send("Send again", null)] : [shareBill],
  };
}
