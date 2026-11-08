import type { HouseholdConfig, MessageTemplates, SetupMessagesResponse } from "@splithouse/shared";
import { buildMessageRows } from "@/lib/settings/build-settings";

/**
 * Whether anyone in the household has a custom template, of either kind. A custom template for someone not in the
 * config doesn't count.
 *
 * @param config - First run's one version's config.
 * @param templates - The wording.
 * @returns True when Custom messages can be saved.
 */
export function hasCustomTemplate(config: HouseholdConfig, templates: MessageTemplates): boolean {
  const people = new Set(config.people.map((p) => p.personId));
  return templates.overrides.some((o) => people.has(o.personId));
}

/**
 * Removes every custom template, Monthly breakdown and Nudge, with the section titles, keeping the Defaults and the
 * line labels.
 *
 * @param templates - The wording.
 * @returns The wording with no custom templates.
 */
export function discardCustomTemplates(templates: MessageTemplates): MessageTemplates {
  return { ...templates, overrides: [], sectionTitles: {} };
}

/**
 * First run's Custom messages page, display-ready: Settings' two Message templates rows, the note, `Save` once a
 * custom template exists, and `Not now`, which asks before discarding them.
 *
 * @param config - First run's one version's config.
 * @param templates - The wording.
 * @returns The response for `GET /api/setup/messages`.
 */
export function buildMessagesPage(config: HouseholdConfig, templates: MessageTemplates): SetupMessagesResponse {
  const custom = hasCustomTemplate(config, templates);
  return {
    title: "Custom messages",
    sub: "Optional",
    rows: buildMessageRows(config, templates),
    note: "You can change these any time in Settings.",
    save: { label: "Save", enabled: custom },
    skip: {
      label: "Not now",
      confirm: custom ?
        {
          title: "Skip custom messages?",
          body: "Your custom templates will be discarded. You can set up custom templates again in Settings.",
          confirmLabel: "Discard templates",
          cancelLabel: "Keep templates",
        } :
        null,
    },
  };
}
