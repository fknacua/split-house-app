import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DATED_ANCHORS,
  DEADLINE_ANCHORS,
  EVENT_TRIGGERS,
  NOTIFICATION_GROUP_KEYS,
  parseNotificationTypeRule,
} from "@splithouse/shared";
import {
  NOTIFICATION_ANCHORS,
  NOTIFICATION_TRIGGERS,
  notificationSource,
  notificationTemplates,
  templatePlaceholders,
} from "./registry";
import { NOTIFICATION_GROUP_ROWS, NOTIFICATION_TYPE_ROWS } from "./rows";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../../prisma/migrations/", import.meta.url));
const MIGRATION = readFileSync(`${MIGRATIONS_DIR}20261127120000_notifications/migration.sql`, "utf8");

/** Every migration after the one that inserts the rows, in the order they apply. */
const LATER_MIGRATIONS = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name > "20261127120000_notifications" && name !== "migration_lock.toml")
  .sort()
  .map((name) => readFileSync(`${MIGRATIONS_DIR}${name}/migration.sql`, "utf8"));

/** The group rows the migration inserts, read from its `VALUES` lines. */
function migrationGroups() {
  const rows = MIGRATION.matchAll(/^\s+\('(\w+)', '([^']+)', '([^']+)', (true|false), (\d+), CURRENT_TIMESTAMP\)/gm);
  return [...rows].map(([, key, label, detail, enabled, sortOrder]) => ({
    key,
    label,
    detail,
    enabled: enabled === "true",
    sortOrder: Number(sortOrder),
  }));
}

/** The type rows the migrations leave: the first one's `VALUES` lines, then each later rule `UPDATE` in order. */
function migrationTypes() {
  const rows = MIGRATION.matchAll(/^\s+\('(\w+)', '(\w+)', '(\w+)', '([^']+)'::jsonb, CURRENT_TIMESTAMP\)/gm);
  const types = [...rows].map(([, key, groupKey, kind, rule]) => ({ key, groupKey, kind, rule: JSON.parse(rule) }));
  for (const sql of LATER_MIGRATIONS) {
    const updates = sql.matchAll(
      /^UPDATE "notification_type" SET "rule" = '([^']+)'::jsonb, "updatedAt" = CURRENT_TIMESTAMP WHERE "key" = '(\w+)';/gm,
    );
    for (const [, rule, key] of updates) {
      const type = types.find((t) => t.key === key);
      if (type) type.rule = JSON.parse(rule);
    }
  }
  return types;
}

describe("the seeded notification rows", () => {
  it("are the rows the migration inserts", () => {
    expect(migrationGroups()).toEqual(NOTIFICATION_GROUP_ROWS);
    expect(migrationTypes()).toEqual(NOTIFICATION_TYPE_ROWS);
  });

  it("have one group per Settings switch, in the switches' order", () => {
    expect(NOTIFICATION_GROUP_ROWS.map((g) => g.key)).toEqual(NOTIFICATION_GROUP_KEYS);
    expect(NOTIFICATION_GROUP_ROWS.map((g) => g.sortOrder)).toEqual([1, 2, 3, 4]);
  });

  it("are all on by default except FYI updates", () => {
    expect(NOTIFICATION_GROUP_ROWS.filter((g) => !g.enabled).map((g) => g.key)).toEqual(["fyi"]);
  });

  it("each parse with the shared rule schema", () => {
    for (const { kind, rule } of NOTIFICATION_TYPE_ROWS) {
      expect(parseNotificationTypeRule(kind, rule)).toEqual({ kind, rule });
    }
  });

  it("put every type in a group, and every group has a type", () => {
    const groups = new Set(NOTIFICATION_GROUP_ROWS.map((g) => g.key));
    expect(NOTIFICATION_TYPE_ROWS.filter((t) => !groups.has(t.groupKey))).toEqual([]);
    expect(NOTIFICATION_GROUP_KEYS.filter((g) => !NOTIFICATION_TYPE_ROWS.some((t) => t.groupKey === g))).toEqual([]);
  });

  it("have unique keys", () => {
    const keys = NOTIFICATION_TYPE_ROWS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("rows match code", () => {
  it("every anchor and trigger the schema allows has code", () => {
    expect(Object.keys(NOTIFICATION_ANCHORS).sort()).toEqual([...DEADLINE_ANCHORS, ...DATED_ANCHORS].sort());
    expect(Object.keys(NOTIFICATION_TRIGGERS).sort()).toEqual([...EVENT_TRIGGERS].sort());
  });

  it("every anchor and trigger in code has a row", () => {
    const used: string[] = NOTIFICATION_TYPE_ROWS.map((t) => (t.kind === "event" ? t.rule.trigger : t.rule.anchor));
    expect([...Object.keys(NOTIFICATION_ANCHORS), ...Object.keys(NOTIFICATION_TRIGGERS)].filter((k) => !used.includes(k)))
      .toEqual([]);
  });

  it("no template uses a placeholder its anchor or trigger doesn't fill", () => {
    const unfilled = NOTIFICATION_TYPE_ROWS.flatMap((type) => {
      const filled = notificationSource(type).placeholders;
      return notificationTemplates(type)
        .flatMap(templatePlaceholders)
        .filter((p) => !filled.includes(p))
        .map((p) => `${type.key}: {${p}}`);
    });
    expect(unfilled).toEqual([]);
  });
});

describe("templatePlaceholders", () => {
  it("names each placeholder once, in order of first use", () => {
    expect(templatePlaceholders("Collect {amount} from {payer}, {amount}")).toEqual(["amount", "payer"]);
    expect(templatePlaceholders("Due today.")).toEqual([]);
  });
});
