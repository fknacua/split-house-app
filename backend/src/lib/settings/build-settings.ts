import type { HouseholdConfig, MessageTemplates, SettingsMessageRow, SettingsResponse } from "@splithouse/shared";
import { TEMPLATE_NAMES } from "@/lib/templates/build-template-form";

const MESSAGE_ROWS: readonly Pick<SettingsMessageRow, "kind" | "name">[] = [
  { kind: "MONTHLY", name: TEMPLATE_NAMES.MONTHLY },
  { kind: "NUDGE", name: TEMPLATE_NAMES.NUDGE },
];

const versionsText = (count: number) => {
  return count === 0 ?
    "Same for everyone" :
    `Custom versions: ${count}`;
};

/**
 * The Settings screen, display-ready.
 *
 * @param input - The signed-in email, the config whose people count, or null before first run, and the wording. A
 *   version for someone who has left isn't counted.
 * @returns The response for `GET /api/settings`.
 */
export function buildSettings(input: {
  email: string;
  config: HouseholdConfig | null;
  templates: MessageTemplates;
}): SettingsResponse {
  const people = new Set(input.config?.people.map((p) => p.personId));
  const overrides = input.templates.overrides.filter((o) => people.has(o.personId));
  return {
    email: input.email,
    messages: MESSAGE_ROWS.map((row) => ({
      ...row,
      detail: versionsText(overrides.filter((o) => o.kind === row.kind).length),
    })),
  };
}
