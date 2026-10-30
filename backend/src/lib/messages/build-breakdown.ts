import { formatCents, type HouseholdConfig } from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";
import { chargeDueDate } from "@/lib/home/due-dates";
import { lineLabel } from "./line-label";

/** A charge, as much of it as a breakdown needs. */
export interface BreakdownCharge {
  personId: string;
  month: string;
  category: ChargeCategory;
  label: string;
  amountCents: number;
  dueDate: Date | null;
  payViaPersonId: string | null;
  paidCents: number | null;
}

/** What `buildBreakdown` reads. */
export interface BreakdownInput {
  /** The message's month, `YYYY-MM`. */
  month: string;
  /** Who the message goes to. */
  recipientId: string;
  /** The config pinned to `month`, for the working and the due days. */
  config: HouseholdConfig;
  /** The month's saved bill's Current Charges, shown on the first utilities line; null without a bill. */
  billCents: number | null;
  /** Names for the "please collect" titles. */
  people: { id: string; name: string }[];
  /** The month's charges and earlier months' corrections; the rules below pick the ones that belong. */
  charges: BreakdownCharge[];
}

/** One line of a breakdown. */
export interface BreakdownLine {
  /** e.g. `Utilities bill (1.5 of 5 shares of $412.30)`. */
  label: string;
  amountCents: number;
  /** e.g. `$123.69`; a credit reads `-$5.00`. */
  amount: string;
}

/** The lines of one person in a breakdown. */
export interface BreakdownSection {
  personId: string;
  /** `Yours:` or `Sam’s (please collect):`, without WhatsApp's bold markers; null when the message has one untitled section. */
  title: string | null;
  lines: BreakdownLine[];
  subtotalCents: number;
  /** e.g. `$1,862.86`; null when the section is untitled. */
  subtotal: string | null;
}

/** A person's monthly breakdown. */
export interface Breakdown {
  /** The recipient's own section first, then each person who pays through them. Empty when nothing is unpaid. */
  sections: BreakdownSection[];
  totalCents: number;
  /** The earliest due date of the charges in it, as a date key; null when none has one. */
  dueDate: string | null;
  /** The sections as message text, for `{lines}`: titles in WhatsApp's `*bold*` markers. */
  text: string;
}

// Lines read in this order within a section: rent first, earlier corrections last.
const CATEGORY_ORDER: ChargeCategory[] = ["RENT", "UTILITIES", "AIRCON", "RECURRING", "ONE_OFF", "CORRECTION"];

/** Thousandths (or plain units) as a short number: 1500 -> `1.5`, 5000 -> `5`. */
function formatAmount(value: number): string {
  return Number(value.toFixed(3)).toString();
}

/**
 * A person's part of a share category (utilities shares in thousandths, aircon units): a tenant's
 * own number, or the owner's or primary tenant's split of what the tenants don't take.
 */
function partOf(
  config: HouseholdConfig,
  personId: string,
  total: number,
  tenantPart: (p: HouseholdConfig["people"][number]) => number,
  primaryBps: number,
): number | null {
  const person = config.people.find((p) => p.personId === personId);
  if (!person) return null;
  if (person.role === "TENANT") return tenantPart(person);
  const remainder = total - config.people.reduce((s, p) => s + (p.role === "TENANT" ? tenantPart(p) : 0), 0);
  const primaryPart = (remainder * primaryBps) / 10000;
  return person.role === "PRIMARY" ? primaryPart : remainder - primaryPart;
}

/** The working shown after a utilities or aircon label, e.g. `(1 of 5 shares)`; null for other lines. */
function working(input: BreakdownInput, charge: BreakdownCharge, withBill: boolean): string | null {
  if (charge.month !== input.month) return null;
  const { utilities, aircon } = input.config.categories;
  if (charge.category === "UTILITIES") {
    const shares = partOf(input.config, charge.personId, utilities.totalShares, (p) => p.utilityShares, utilities.primaryBps);
    if (shares === null) return null;
    const total = utilities.totalShares / 1000;
    const bill = withBill && input.billCents !== null ? ` of ${formatCents(input.billCents)}` : "";
    return `(${formatAmount(shares / 1000)} of ${formatAmount(total)} ${total === 1 ? "share" : "shares"}${bill})`;
  }
  if (charge.category === "AIRCON") {
    const units = partOf(input.config, charge.personId, aircon.totalUnits, (p) => p.airconUnits, aircon.primaryBps);
    if (units === null) return null;
    return `(${formatAmount(units)} of ${aircon.totalUnits} ${aircon.totalUnits === 1 ? "unit" : "units"})`;
  }
  return null;
}

/**
 * Builds a person's monthly breakdown. It holds the unpaid charges the recipient pays: their own
 * and those paid through them, from the month, plus unpaid corrections from earlier months.
 * Paid charges are left out, so the total is what they still owe; a credit is a negative line.
 * Each person gets a section; the titles and subtotals show only when the message has someone
 * else's section, since a lone section's subtotal is the total.
 *
 * @param input - The month, recipient, config, bill, people and charges.
 * @returns The sections, the total, the earliest due date and the text for `{lines}`.
 */
export function buildBreakdown(input: BreakdownInput): Breakdown {
  const included = input.charges.filter(
    (c) =>
      (c.payViaPersonId ?? c.personId) === input.recipientId &&
      c.paidCents === null &&
      (c.month === input.month || (c.category === "CORRECTION" && c.month < input.month)),
  );

  const byPerson = new Map<string, BreakdownCharge[]>();
  for (const charge of included) {
    byPerson.set(charge.personId, [...(byPerson.get(charge.personId) ?? []), charge]);
  }
  const order = [input.recipientId, ...input.people.map((p) => p.id)];
  const personIds = [...byPerson.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const titled = personIds.some((id) => id !== input.recipientId);
  const names = new Map(input.people.map((p) => [p.id, p.name]));

  let billShown = false;
  const sections = personIds.map((personId): BreakdownSection => {
    const charges = [...byPerson.get(personId)!].sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
        a.month.localeCompare(b.month) ||
        a.label.localeCompare(b.label),
    );
    const lines = charges.map((charge): BreakdownLine => {
      const withBill = charge.category === "UTILITIES" && !billShown;
      const work = working(input, charge, withBill);
      if (withBill && work) billShown = true;
      const label = lineLabel(input.config, charge);
      return {
        label: work ? `${label} ${work}` : label,
        amountCents: charge.amountCents,
        amount: formatCents(charge.amountCents),
      };
    });
    const subtotalCents = lines.reduce((s, l) => s + l.amountCents, 0);
    const title = personId === input.recipientId ? "Yours:" : `${names.get(personId) ?? "Someone"}’s (please collect):`;
    return {
      personId,
      title: titled ? title : null,
      lines,
      subtotalCents,
      subtotal: titled ? formatCents(subtotalCents) : null,
    };
  });

  const dueDates = included
    .map((c) => chargeDueDate(c.month, input.config, c))
    .filter((d): d is string => d !== null)
    .sort();

  return {
    sections,
    totalCents: sections.reduce((s, sec) => s + sec.subtotalCents, 0),
    dueDate: dueDates[0] ?? null,
    text: sections.map(sectionText).join("\n\n"),
  };
}

/** A section as message text: the bold title, a line per charge, then the subtotal. */
function sectionText(section: BreakdownSection): string {
  return [
    ...(section.title ? [`*${section.title}*`] : []),
    ...section.lines.map((l) => `${l.label} ${l.amount}`),
    ...(section.subtotal ? [`Subtotal ${section.subtotal}`] : []),
  ].join("\n");
}
