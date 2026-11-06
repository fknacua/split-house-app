import { formatCents, type HouseholdConfig, type MessageTemplates, type TemplateEditorResponse } from "@splithouse/shared";
import { hasPayersVia } from "@/lib/household/route-via";
import { buildBreakdown, usualSectionTitle } from "@/lib/messages/build-breakdown";
import { buildSampleCharges, SAMPLE_BILL_CENTS } from "./sample-charges";

/** What `buildSectionLabels` reads. */
export interface SectionLabelsInput {
  /** Whose custom template it is: the recipient of the message. */
  personId: string;
  /** The active month, which the sample charges are dated with. */
  month: string;
  /**
   * Next month's config, then the active month's when there is one. A household edit starts next month, so someone
   * can still have payers this month after an edit takes them away.
   */
  configs: HouseholdConfig[];
  /** The current wording, for the saved section labels and the line labels. */
  templates: MessageTemplates;
  /** Everyone's names. */
  people: { id: string; name: string }[];
}

/**
 * The Section labels card and sheet for someone others pay via: a row per section of their monthly breakdown, built
 * from the sample charges the preview uses, so the sheet's sections match the editor's preview. It shows when anyone
 * pays via them this month or next, using the first config where someone does.
 *
 * @param input - The person, the month, the configs, the wording and the names.
 * @returns The block, or null when nobody pays via them in either month, so their message has a single untitled
 *   section.
 */
export function buildSectionLabels(input: SectionLabelsInput): TemplateEditorResponse["sectionLabels"] {
  const { personId, month, templates, people } = input;
  const config = input.configs.find(
    (c) => c.people.some((p) => p.personId === personId) && hasPayersVia(c.people, personId),
  );
  if (!config) return null;
  const breakdown = buildBreakdown({
    month,
    recipientId: personId,
    config,
    templates,
    billCents: SAMPLE_BILL_CENTS,
    people,
    charges: buildSampleCharges(config, month),
  });
  if (breakdown.sections.length < 2) return null;

  const names = new Map(people.map((p) => [p.id, p.name]));
  const saved = templates.sectionTitles[personId] ?? {};
  return {
    title: "Section labels",
    hint: "This person is set to pay for another person(s). Message will list each person’s charges under their own title.",
    rows: breakdown.sections.map((section) => ({
      personId: section.personId,
      label: `${names.get(section.personId) ?? "Someone"}’s charges`,
      value: saved[section.personId] ?? "",
      placeholder: usualSectionTitle(section.personId, personId, names.get(section.personId)),
      lines: section.lines.map(({ label, amount, working }) => ({ label, amount, working })),
      subtotal: formatCents(section.subtotalCents),
    })),
  };
}
