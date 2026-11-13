import {
  formatCents,
  formatDateShort,
  formatMonthShortLabel,
  TEMPLATE_PLACEHOLDERS,
  type HouseholdConfig,
  type MessagePreview,
  type MessageTemplates,
} from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";
import { chargeDueDate } from "@/lib/home/due-dates";
import { boldRuns } from "./bold-runs";
import {
  buildBreakdown,
  buildSections,
  sectionsText,
  type Breakdown,
  type BreakdownInput,
  type BreakdownSection,
} from "./build-breakdown";

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
 * @param templates - The message wording.
 * @param personId - Who the message goes to.
 * @param kind - The monthly breakdown or the nudge.
 * @returns The template text.
 */
export function templateFor(templates: MessageTemplates, personId: string, kind: MessageKind): string {
  const override = templates.overrides.find((o) => o.personId === personId && o.kind === kind);
  if (override) return override.text;
  return kind === "MONTHLY" ? templates.monthly : templates.nudge;
}

/** A monthly breakdown message, filled in. */
export interface MonthlyMessage {
  /** The whole message, exactly as it is sent and copied. */
  text: string;
  /** The filled template before `{lines}`, without the blank lines next to it. */
  before: string;
  /** The filled template after `{lines}`, without the blank lines next to it; empty without `{lines}`. */
  after: string;
  breakdown: Breakdown;
}

/** What `renderMonthlyMessage` reads: the breakdown's input and the recipient's name. */
export interface MonthlyMessageInput extends BreakdownInput {
  recipientName: string;
}

/** Leaves out each template line holding `{dueDate}` (but not `{lines}`), and the blank lines it leaves at the end. */
function withoutDueDateLines(template: string): string {
  return template
    .split("\n")
    .filter((line) => !line.includes("{dueDate}") || line.includes("{lines}"))
    .join("\n")
    .replace(/\n+$/, "");
}

/**
 * Renders a person's monthly breakdown message from their template (or override). `{lines}` is the
 * breakdown's sections, `{month}` reads `Nov 2026`, `{total}` the breakdown's total and `{dueDate}`
 * the earliest due date in it (`7 Nov`). When nothing in it has a due date (only a correction is
 * left), the template lines holding `{dueDate}` are left out. The template's own text is sent as
 * written: any `*bold*` markers in it are the template's, none are added.
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
  const own = templateFor(input.templates, input.recipientId, "MONTHLY");
  const template = breakdown.dueDate ? own : withoutDueDateLines(own);
  return { ...fillAroundLines(template, values), breakdown };
}

/**
 * Fills a template whole, and the parts before and after its first `{lines}` apart, for the preview card.
 */
function fillAroundLines(template: string, values: TemplateValues): { text: string; before: string; after: string } {
  const [head, ...rest] = template.split("{lines}");
  const tail = rest.join("{lines}").replace(/^\n+/, "");
  return {
    text: fillTemplate(template, values),
    before: fillTemplate(head, values).replace(/\n+$/, ""),
    after: fillTemplate(tail, values),
  };
}

/**
 * A monthly message in the parts the preview card shows, the template text in bold and plain pieces.
 *
 * @param message - The rendered message.
 * @returns The intro, sections, outro and exact text.
 */
export function monthlyMessagePreview(message: MonthlyMessage): MessagePreview {
  return previewOf({ ...message, sections: message.breakdown.sections });
}

/**
 * A nudge in the parts the preview card shows, laid out as the monthly breakdown.
 *
 * @param message - The rendered nudge.
 * @returns The intro, sections, outro and exact text.
 */
export function nudgeMessagePreview(message: NudgeMessage): MessagePreview {
  return previewOf(message);
}

/** A filled message in the preview card's parts. */
function previewOf(message: { text: string; before: string; after: string; sections: BreakdownSection[] }): MessagePreview {
  return {
    intro: boldRuns(message.before),
    sections: message.sections.map((s) => ({
      title: s.title,
      lines: s.lines.map((l) => ({ label: l.label, amount: l.amount, working: l.working })),
      subtotal: s.subtotal,
    })),
    outro: boldRuns(message.after),
    text: message.text,
  };
}

/** A charge, as much of it as a nudge needs. */
export interface NudgeCharge {
  /** Whose charge it is: the recipient's own, or someone's they collect. */
  personId: string;
  month: string;
  category: ChargeCategory;
  label: string;
  amountCents: number;
  dueDate: Date | null;
  payViaPersonId: string | null;
}

/** What `renderNudgeMessage` reads. */
export interface NudgeMessageInput {
  /** Who the nudge goes to: the person who pays the charges. */
  recipientId: string;
  recipientName: string;
  /** The active month, for `{month}`. */
  month: string;
  /** The config pinned to the active month, for the due dates. */
  config: HouseholdConfig;
  /** The current wording. */
  templates: MessageTemplates;
  /** Names for the default "please collect" section titles. */
  people: { id: string; name: string }[];
  /** The charges the nudge is about: the ticked ones. */
  charges: NudgeCharge[];
}

/** A nudge, filled in. */
export interface NudgeMessage {
  /** The whole message, exactly as it is sent and copied. */
  text: string;
  /** The filled template before `{lines}`, without the blank lines next to it. */
  before: string;
  /** The filled template after `{lines}`, without the blank lines next to it; empty without `{lines}`. */
  after: string;
  /** The charges' lines, in sections as the monthly breakdown's. */
  sections: BreakdownSection[];
  totalCents: number;
}

/**
 * Renders a nudge about one or more charges from the recipient's nudge template (or override).
 * `{lines}` is one line per charge, built as the monthly breakdown's with `(due 1 Nov)` as the working
 * (in `Yours` and collect sections once a collected charge is in it), `{total}` their sum, `{month}`
 * the active month (`Nov 2026`) and `{name}` the recipient's name.
 *
 * @param input - The recipient, the month, the config, the wording, the people and the charges.
 * @returns The message, its two template parts and its sections.
 */
export function renderNudgeMessage(input: NudgeMessageInput): NudgeMessage {
  const { config } = input;
  const template = templateFor(input.templates, input.recipientId, "NUDGE");
  if (input.charges.length === 0) {
    // Nothing to list (a preview for someone with no charges): `{lines}` and `{total}` stay as typed.
    const text = fillTemplate(template, { name: input.recipientName, month: formatMonthShortLabel(input.month) });
    return { text, before: text, after: "", sections: [], totalCents: 0 };
  }
  const sections = buildSections({
    recipientId: input.recipientId,
    templates: input.templates,
    people: input.people,
    charges: input.charges,
    working: (charge) => {
      const dueDate = chargeDueDate(charge.month, config, charge);
      return dueDate ? `(due ${formatDateShort(dueDate)})` : null;
    },
  });
  const totalCents = sections.reduce((s, sec) => s + sec.subtotalCents, 0);
  const filled = fillAroundLines(template, {
    name: input.recipientName,
    month: formatMonthShortLabel(input.month),
    lines: sectionsText(sections),
    total: formatCents(totalCents),
  });
  return { ...filled, sections, totalCents };
}
