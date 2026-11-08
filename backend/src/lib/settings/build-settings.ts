import type { HouseholdConfig, MessageTemplates, SettingsMessageRow, SettingsResponse } from "@splithouse/shared";
import { TEMPLATE_NAMES } from "@/lib/templates/template-text";

const MESSAGE_ROWS: readonly Pick<SettingsMessageRow, "kind" | "name" | "description">[] = [
  { kind: "MONTHLY", name: TEMPLATE_NAMES.MONTHLY, description: "Sent when the month’s charges are ready" },
  { kind: "NUDGE", name: TEMPLATE_NAMES.NUDGE, description: "Sent when a payment is overdue" },
];

/**
 * The Message templates rows, Monthly breakdown then Nudge, as Settings and First run's Custom messages show them.
 *
 * @param config - The config whose people count, or null before Rent & rooms is saved. A custom template for someone
 *   not in it isn't counted.
 * @param templates - The wording.
 * @returns The two rows, each with its description and how many custom templates it has.
 */
export function buildMessageRows(config: HouseholdConfig | null, templates: MessageTemplates): SettingsMessageRow[] {
  const people = new Set(config?.people.map((p) => p.personId));
  const overrides = templates.overrides.filter((o) => people.has(o.personId));
  return MESSAGE_ROWS.map((row) => {
    const count = overrides.filter((o) => o.kind === row.kind).length;
    return count === 0 ?
      { ...row, detail: "Same for everyone", tone: "muted" } :
      { ...row, detail: `Custom templates: ${count}`, tone: "success" };
  });
}

/**
 * The Settings screen, display-ready.
 *
 * @param input - The signed-in email, the config whose people count, or null before first run, and the wording. A
 *   custom template for someone who has left isn't counted.
 * @returns The response for `GET /api/settings`.
 */
export function buildSettings(input: {
  email: string;
  config: HouseholdConfig | null;
  templates: MessageTemplates;
}): SettingsResponse {
  return { email: input.email, messages: buildMessageRows(input.config, input.templates) };
}
