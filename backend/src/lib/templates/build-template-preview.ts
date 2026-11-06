import {
  formatMonthShortLabel,
  type HouseholdConfig,
  type MessagePreview,
  type MessageTemplates,
  type TemplateKind,
} from "@splithouse/shared";
import type { BreakdownCharge } from "@/lib/messages/build-breakdown";
import {
  fillTemplate,
  monthlyMessagePreview,
  nudgeMessagePreview,
  renderMonthlyMessage,
  renderNudgeMessage,
} from "@/lib/messages/render";
import { buildSampleCharges, SAMPLE_BILL_CENTS } from "./sample-charges";

/** What `buildTemplatePreview` reads. */
export interface TemplatePreviewInput {
  kind: TemplateKind;
  /** The text to render. */
  text: string;
  /** The active month, which the message is dated with. */
  month: string;
  /** The config the person is in, which the sample charges are built from. */
  config: HouseholdConfig;
  /** The current wording, for the line labels and section titles. */
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
 * Renders a template's text through the code Recipient uses, on sample charges holding every line the person would
 * have, so a changed label always shows. The text replaces every version of the template, so a saved custom template
 * can't hide it. A nudge for someone with no charges fills only `{name}` and `{month}`.
 *
 * @param input - The text, the month, the config, the wording and the person.
 * @returns The rendered message, or null for blank text, which has nothing to preview.
 */
export function buildTemplatePreview(input: TemplatePreviewInput): MessagePreview | null {
  const { kind, text, month, config, person, people } = input;
  if (text.trim() === "") return null;
  const templates: MessageTemplates = { ...input.templates, monthly: text, nudge: text, overrides: [] };
  const charges = buildSampleCharges(config, month);

  if (kind === "MONTHLY") {
    return monthlyMessagePreview(
      renderMonthlyMessage({
        month,
        recipientId: person.id,
        recipientName: person.name,
        config,
        templates,
        billCents: SAMPLE_BILL_CENTS,
        people,
        charges,
      }),
    );
  }

  const charge = sampleNudgeCharge(config, person.id, charges);
  if (!charge) return nudgeMessagePreview(fillTemplate(text, { name: person.name, month: formatMonthShortLabel(month) }));
  return nudgeMessagePreview(
    renderNudgeMessage({ recipientId: person.id, recipientName: person.name, config, templates, charge }),
  );
}
