import {
  LINE_LABEL_TYPES,
  type HouseholdConfig,
  type MessageTemplates,
  type TemplateFormResponse,
  type TemplateKind,
} from "@splithouse/shared";
import { DEFAULT_LINE_LABELS } from "@/lib/messages/line-label";

/** What each template is called, on the Messages rows and the editor. */
export const TEMPLATE_NAMES: Record<TemplateKind, string> = {
  MONTHLY: "Monthly breakdown",
  NUDGE: "Nudge",
};

const PLACEHOLDER_CHIPS: Record<TemplateKind, string[]> = {
  MONTHLY: ["{name}", "{month}", "{lines}", "{total}", "{dueDate}"],
  NUDGE: ["{name}", "{charge}", "{month}", "{amount}", "{dueDate}"],
};

/**
 * Who can have their own version of a template: anyone in this month's or next month's household but the owner, who
 * sends the messages. Someone leaving next month still gets this month's messages, and a new tenant is due theirs soon.
 *
 * @param configs - The versions to look in, the first one's people first.
 * @returns The people's ids.
 */
export function templatePersonIds(configs: HouseholdConfig[]): string[] {
  const ids = configs.flatMap((config) => config.people.filter((p) => p.role !== "OWNER").map((p) => p.personId));
  return [...new Set(ids)];
}

/**
 * Who the nudge preview can show when nobody is chosen: a tenant, for their rent, then the primary tenant, for their
 * utilities share.
 *
 * @param config - The config in effect next month.
 * @returns The people's ids, in the order drawn.
 */
export function nudgeSampleIds(config: HouseholdConfig): string[] {
  const tenant = config.people.findLast((p) => p.role === "TENANT");
  const primary = config.people.find((p) => p.role === "PRIMARY");
  return [tenant, primary].filter((p) => p !== undefined).map((p) => p.personId);
}

const everyonesText = (templates: MessageTemplates, kind: TemplateKind) =>
  kind === "MONTHLY" ? templates.monthly : templates.nudge;

/** The note under Applies to. */
function appliesToNote(templates: MessageTemplates, kind: TemplateKind, person: { name: string; hasOwn: boolean } | null): string {
  if (person) {
    return person.hasOwn
      ? `Only ${person.name} gets this version. Removing it puts them back on Everyone’s.`
      : `${person.name} uses Everyone’s version. Saving a change gives them their own.`;
  }
  const hasOverrides = templates.overrides.some((o) => o.kind === kind);
  return kind === "NUDGE" && !hasOverrides
    ? "Everyone gets this nudge. Pick someone to give them their own version."
    : "Everyone without their own version uses this.";
}

/** What `buildTemplateForm` reads. */
export interface TemplateFormInput {
  kind: TemplateKind;
  /** The person loaded, one of `personIds`, or null for the version everyone else uses. */
  personId: string | null;
  /** The version in effect next month, whose people the nudge samples. */
  config: HouseholdConfig;
  /** The current wording. */
  templates: MessageTemplates;
  /** Who Applies to offers, from `templatePersonIds`. */
  personIds: string[];
  people: { id: string; name: string }[];
}

/**
 * The template editor, display-ready, with the current values. Both templates show the same line label fields, which
 * hold the whole household's labels, so a change in one shows in the other.
 *
 * @param input - The template, the person, next month's version, the wording, who it can apply to and the names.
 * @returns The response for `GET /api/templates/:kind`.
 */
export function buildTemplateForm(input: TemplateFormInput): TemplateFormResponse {
  const { kind, personId, config, templates } = input;
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const nameOf = (id: string) => names.get(id) ?? "Someone";
  const own = personId ? templates.overrides.find((o) => o.personId === personId && o.kind === kind) : undefined;
  const isMonthly = kind === "MONTHLY";
  const labelOf = (type: (typeof LINE_LABEL_TYPES)[number]) => templates.lineLabels[type] ?? DEFAULT_LINE_LABELS[type];

  return {
    kind,
    title: TEMPLATE_NAMES[kind],
    sub: "Message template",
    personId,
    text: own?.text ?? everyonesText(templates, kind),
    placeholders: PLACEHOLDER_CHIPS[kind],
    appliesTo: {
      options: [
        { personId: null, label: "Everyone" },
        ...input.personIds.map((id) => ({ personId: id, label: nameOf(id) })),
      ],
      note: appliesToNote(templates, kind, personId ? { name: nameOf(personId), hasOwn: own !== undefined } : null),
    },
    lineLabels: {
      title: "Line labels",
      note: isMonthly
        ? "How each charge is named in {lines}. Nudges use them too."
        : "How each charge is named in {charge}. The monthly breakdown uses them too.",
      rows: LINE_LABEL_TYPES.map((type) => ({ type, label: DEFAULT_LINE_LABELS[type], value: labelOf(type) })),
    },
    samples: isMonthly || personId ? [] : nudgeSampleIds(config).map((id) => ({ personId: id, label: nameOf(id) })),
    secondaryAction: own ? { label: "Remove this version", kind: "remove-version" } : { label: "Cancel", kind: "cancel" },
    removeDialog:
      own && personId
        ? {
            title: "Remove this version?",
            body: `${nameOf(personId)} goes back to the Everyone template. Messages already sent won’t change.`,
          }
        : null,
  };
}
