import type { MessageTemplates, TemplateKind } from "@splithouse/shared";

/** What each template is called, on the Settings rows, the landing page and the editor. */
export const TEMPLATE_NAMES: Record<TemplateKind, string> = {
  MONTHLY: "Monthly breakdown",
  NUDGE: "Nudge",
};

/**
 * The Default's text of a template.
 *
 * @param templates - The wording.
 * @param kind - The monthly breakdown or the nudge.
 * @returns The text everyone without a custom template gets.
 */
export const defaultText = (templates: MessageTemplates, kind: TemplateKind): string =>
  kind === "MONTHLY" ? templates.monthly : templates.nudge;

/**
 * A person's custom template, if they have one.
 *
 * @param templates - The wording.
 * @param kind - The monthly breakdown or the nudge.
 * @param personId - Whose.
 * @returns Their text, or undefined when they get the Default.
 */
export const customText = (templates: MessageTemplates, kind: TemplateKind, personId: string): string | undefined =>
  templates.overrides.find((o) => o.personId === personId && o.kind === kind)?.text;
