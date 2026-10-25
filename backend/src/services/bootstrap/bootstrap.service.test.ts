import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bootstrapResponseSchema,
  DEFAULT_NOTIFICATIONS,
  HOUSEHOLD_SCHEMA_VERSION,
} from "@splithouse/shared";
import { NOV_2026_CONFIG } from "@/lib/fixtures/household";
import { currentMonth } from "@/lib/month";
import { getBootstrap, type BootstrapDb } from "./bootstrap.service";

function fakeDb(opts: {
  version?: { schemaVersion: number; config: unknown } | null;
  notifications?: unknown;
  /** The newest opened month. */
  newestMonth?: string;
}): BootstrapDb {
  return {
    householdVersion: { findFirst: async () => opts.version ?? null },
    settings: {
      findUnique: async () =>
        opts.notifications === undefined ? null : { notifications: opts.notifications },
    },
    month: { findFirst: async () => (opts.newestMonth ? { month: opts.newestMonth } : null) },
  };
}

afterEach(() => vi.unstubAllEnvs());

describe("getBootstrap", () => {
  it("says there is no household before first run, with the default settings", async () => {
    const result = await getBootstrap(fakeDb({}));
    expect(result.hasHousehold).toBe(false);
    expect(result.currentMonth).toBe(currentMonth());
    expect(result.setupProgress.every((s) => !s.done)).toBe(true);
    expect(result.settings.notifications).toEqual(DEFAULT_NOTIFICATIONS);
  });

  it("reports a household, its progress and the stored toggles", async () => {
    const result = await getBootstrap(
      fakeDb({
        version: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
        notifications: { checks: false },
      }),
    );
    expect(result.hasHousehold).toBe(true);
    expect(result.setupProgress.filter((s) => s.done).map((s) => s.id)).toEqual([
      "rentAndRooms",
      "people",
      "yourSplit",
    ]);
    expect(result.settings.notifications).toEqual({ ...DEFAULT_NOTIFICATIONS, checks: false });
  });

  it("reports a month started early as the current month", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-29T09:00:00+08:00");
    const result = await getBootstrap(fakeDb({ newestMonth: "2026-12" }));
    expect(result.currentMonth).toBe("2026-12");
  });

  it("matches the shared response schema the app reads", async () => {
    const withHousehold = await getBootstrap(
      fakeDb({ version: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG } }),
    );
    expect(bootstrapResponseSchema.safeParse(withHousehold).success).toBe(true);
    expect(bootstrapResponseSchema.safeParse(await getBootstrap(fakeDb({}))).success).toBe(true);
  });

  it("throws for a version with an unknown schemaVersion instead of misreading it", async () => {
    await expect(
      getBootstrap(fakeDb({ version: { schemaVersion: 999, config: NOV_2026_CONFIG } })),
    ).rejects.toThrow(/schemaVersion/);
  });
});
