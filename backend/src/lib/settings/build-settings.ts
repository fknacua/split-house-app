import type { HouseholdConfig, SettingsMessageRow, SettingsResponse } from "@splithouse/shared";

const MESSAGE_ROWS: readonly Pick<SettingsMessageRow, "kind" | "name">[] = [
  { kind: "MONTHLY", name: "Monthly breakdown" },
  { kind: "NUDGE", name: "Nudge" },
];

const versionsText = (count: number) => {
  return count === 0 ? 
    "Same for everyone" : 
    `Custom versions: ${count}`;
};

/**
 * The Settings screen, display-ready.
 *
 * @param input - The signed-in email and the config whose templates to count, or null before first run, when
 *   nobody has a custom version yet.
 * @returns The response for `GET /api/settings`.
 */
export function buildSettings(input: { email: string; config: HouseholdConfig | null }): SettingsResponse {
  const overrides = input.config?.templates.overrides ?? [];
  return {
    email: input.email,
    messages: MESSAGE_ROWS.map((row) => ({
      ...row,
      detail: versionsText(overrides.filter((o) => o.kind === row.kind).length),
    })),
  };
}
