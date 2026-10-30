import {
  formatCents,
  formatDateShort,
  formatMonthShortLabel,
  TEMPLATE_PLACEHOLDERS,
  type HouseholdConfig,
} from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";
import { chargeDueDate } from "@/lib/home/due-dates";
import { buildBreakdown, type Breakdown, type BreakdownInput } from "./build-breakdown";
import { lineLabel } from "./line-label";

/** One of the placeholders a template may use, without the braces. */
export type TemplatePlaceholder = (typeof TEMPLATE_PLACEHOLDERS)[number];

/** The text for each placeholder. One left out stays in the message as typed. */
export type TemplateValues = Partial<Record<TemplatePlaceholder, string>>;

/** The message kinds a template exists for. */
export type MessageKind = "MONTHLY" | "NUDGE";

const PLACEHOLDERS = new Set<string>(TEMPLATE_PLACEHOLDERS);

/**
 * Fills a template's placeholders in one pass, so text put in is never filled again. A placeholder
 * with no value, or a `{word}` that is not a placeholder, stays as typed, so a mistake in a
 * template shows in the preview instead of disappearing.
 *
 * @param template - The template text, e.g. `Hi {name}!`.
 * @param values - The text for each placeholder.
 * @returns The filled text.
 */
export function fillTemplate(template: string, values: TemplateValues): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (!PLACEHOLDERS.has(key)) return match;
    return values[key as TemplatePlaceholder] ?? match;
  });
}

/**
 * The template a person's message uses: their own override for the kind, or the household's.
 *
 * @param config - The config pinned to the month.
 * @param personId - Who the message goes to.
 * @param kind - The monthly breakdown or the nudge.
 * @returns The template text.
 */
export function templateFor(config: HouseholdConfig, personId: string, kind: MessageKind): string {
  const override = config.templates.overrides.find((o) => o.personId === personId && o.kind === kind);
  if (override) return override.text;
  return kind === "MONTHLY" ? config.templates.monthly : config.templates.nudge;
}

/** A monthly breakdown message, filled in. */
export interface MonthlyMessage {
  /** The whole message, exactly as it is sent and copied. */
  text: string;
  /** The filled template before `{lines}`, without the blank lines next to it. */
  before: string;
  /** The filled template after `{lines}`, without the blank lines next to it; empty without `{lines}`. */
  after: string;
  /** `after` line by line, each flagged when its template line holds `{total}`, so a preview can stress it. */
  afterLines: MessageLine[];
  breakdown: Breakdown;
}

/** One line of a filled template. */
export interface MessageLine {
  text: string;
  /** True when the template line holds `{total}`. */
  isTotal: boolean;
}

/** What `renderMonthlyMessage` reads: the breakdown's input and the recipient's name. */
export interface MonthlyMessageInput extends BreakdownInput {
  recipientName: string;
}

/**
 * Renders a person's monthly breakdown message from their template (or override). `{lines}` is the
 * breakdown's sections, `{month}` reads `Nov 2026`, `{total}` the breakdown's total and `{dueDate}`
 * the earliest due date in it (`7 Nov`).
 *
 * @param input - The month, recipient, config, bill, people and charges.
 * @returns The message, its two template parts and the breakdown.
 */
export function renderMonthlyMessage(input: MonthlyMessageInput): MonthlyMessage {
  const breakdown = buildBreakdown(input);
  const values: TemplateValues = {
    name: input.recipientName,
    month: formatMonthShortLabel(input.month),
    lines: breakdown.text,
    total: formatCents(breakdown.totalCents),
    ...(breakdown.dueDate ? { dueDate: formatDateShort(breakdown.dueDate) } : {}),
  };
  const template = templateFor(input.config, input.recipientId, "MONTHLY");
  const [head, ...rest] = template.split("{lines}");
  const tail = rest.join("{lines}").replace(/^\n+/, "");
  return {
    text: fillTemplate(template, values),
    before: fillTemplate(head, values).replace(/\n+$/, ""),
    after: fillTemplate(tail, values),
    afterLines: tail
      ? tail.split("\n").map((line) => ({ text: fillTemplate(line, values), isTotal: line.includes("{total}") }))
      : [],
    breakdown,
  };
}

/** A charge, as much of it as a nudge needs. */
export interface NudgeCharge {
  month: string;
  category: ChargeCategory;
  label: string;
  amountCents: number;
  dueDate: Date | null;
  payViaPersonId: string | null;
}

/** What `renderNudgeMessage` reads. */
export interface NudgeMessageInput {
  /** Who the nudge goes to: the person who pays the charge. */
  recipientId: string;
  recipientName: string;
  /** The config pinned to the charge's month. */
  config: HouseholdConfig;
  charge: NudgeCharge;
}

/**
 * Renders a nudge about one charge from the recipient's nudge template (or override). `{charge}` is
 * the line label as is (`Rent`), `{month}` the charge's month (`Nov 2026`), `{amount}` its amount
 * and `{dueDate}` its due date (`1 Nov`).
 *
 * @param input - The recipient, the config and the charge.
 * @returns The message text, exactly as it is sent.
 */
export function renderNudgeMessage(input: NudgeMessageInput): string {
  const { charge, config } = input;
  const dueDate = chargeDueDate(charge.month, config, charge);
  return fillTemplate(templateFor(config, input.recipientId, "NUDGE"), {
    name: input.recipientName,
    charge: lineLabel(config, charge),
    month: formatMonthShortLabel(charge.month),
    amount: formatCents(charge.amountCents),
    ...(dueDate ? { dueDate: formatDateShort(dueDate) } : {}),
  });
}
