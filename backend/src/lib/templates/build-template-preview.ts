import {
  formatMonthShortLabel,
  type HouseholdConfig,
  type MessagePreview,
  type MessageTemplates,
  type TemplateKind,
} from "@splithouse/shared";
import type { BreakdownCharge } from "@/lib/messages/build-breakdown";
import { lineLabel } from "@/lib/messages/line-label";
import {
  fillTemplate,
  monthlyMessagePreview,
  nudgeMessagePreview,
  renderMonthlyMessage,
  renderNudgeMessage,
} from "@/lib/messages/render";
import { nudgeSampleIds } from "./build-template-form";
import { buildSampleCharges, SAMPLE_BILL_CENTS } from "./sample-charges";

/**
 * Who a draft is previewed on: the person chosen, else on a nudge the sample asked for, else the first sample; on a
 * monthly breakdown the primary tenant, whose message is the fullest, else a tenant. The owner only with nobody else.
 *
 * @param config - The config in effect next month.
 * @param input - The template, the person chosen and the sample asked for.
 * @returns The person's id.
 */
export function previewPersonId(
  config: HouseholdConfig,
  input: { kind: TemplateKind; personId: string | null; samplePersonId?: string | null },
): string {
  if (input.personId) return input.personId;
  const samples = nudgeSampleIds(config);
  if (input.kind === "NUDGE" && input.samplePersonId && samples.includes(input.samplePersonId)) return input.samplePersonId;
  const first = input.kind === "NUDGE" ? samples[0] : samples.at(-1);
  return first ?? config.people[0].personId;
}

/** What `buildTemplatePreview` reads. */
export interface TemplatePreviewInput {
  kind: TemplateKind;
  /** The draft text. */
  text: string;
  /** The active month, which the message is dated with. */
  month: string;
  /** Next month's config, which the sample charges are built from. */
  config: HouseholdConfig;
  /** The wording with the draft's line labels. */
  templates: MessageTemplates;
  person: { id: string; name: string };
  people: { id: string; name: string }[];
}

/** The charge a sample nudge is about: the primary tenant's utilities, or anyone else's rent, else their first charge. */
function sampleNudgeCharge(config: HouseholdConfig, personId: string, charges: BreakdownCharge[]): BreakdownCharge | null {
  const own = charges.filter((c) => c.personId === personId);
  const isPrimary = config.people.some((p) => p.personId === personId && p.role === "PRIMARY");
  const category = isPrimary ? "UTILITIES" : "RENT";
  return own.find((c) => c.category === category) ?? own[0] ?? null;
}

/**
 * Renders a draft through the code Recipient uses, on sample charges holding every line the person would have, so a
 * changed label always shows. The draft replaces every version of the template, so the person's saved override can't
 * hide it. A nudge for someone with no charges fills only `{name}` and `{month}`.
 *
 * @param input - The draft, the month, the config, the wording and the person.
 * @returns The caption and the rendered message.
 */
export function buildTemplatePreview(input: TemplatePreviewInput): { meta: string; preview: MessagePreview } {
  const { kind, text, month, config, person, people } = input;
  const templates: MessageTemplates = { ...input.templates, monthly: text, nudge: text, overrides: [] };
  const monthLabel = formatMonthShortLabel(month);
  const charges = buildSampleCharges(config, month);

  if (kind === "MONTHLY") {
    const message = renderMonthlyMessage({
      month,
      recipientId: person.id,
      recipientName: person.name,
      config,
      templates,
      billCents: SAMPLE_BILL_CENTS,
      people,
      charges,
    });
    return { meta: `${person.name} · ${monthLabel} sample`, preview: monthlyMessagePreview(message) };
  }

  const charge = sampleNudgeCharge(config, person.id, charges);
  if (!charge) {
    return {
      meta: `${person.name} · ${monthLabel} sample`,
      preview: nudgeMessagePreview(fillTemplate(text, { name: person.name, month: monthLabel })),
    };
  }
  return {
    meta: `${person.name} · ${lineLabel(templates, charge)} · ${monthLabel} sample`,
    preview: nudgeMessagePreview(
      renderNudgeMessage({ recipientId: person.id, recipientName: person.name, config, templates, charge }),
    ),
  };
}
