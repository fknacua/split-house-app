import { afterEach, describe, expect, it, vi } from "vitest";
import { bootstrapResponseSchema, HOUSEHOLD_SCHEMA_VERSION } from "@splithouse/shared";
import { NOV_2026_CONFIG } from "@/lib/fixtures/household";
import { currentMonth } from "@/lib/month";
import { getBootstrap, type BootstrapDb } from "./bootstrap.service";

function fakeDb(opts: {
  version?: { schemaVersion: number; config: unknown } | null;
  /** The newest opened month. */
  newestMonth?: string;
}): BootstrapDb {
  return {
    householdVersion: { findFirst: async () => opts.version ?? null },
    month: { findFirst: async () => (opts.newestMonth ? { month: opts.newestMonth } : null) },
  };
}

afterEach(() => vi.unstubAllEnvs());

describe("getBootstrap", () => {
  it("says there is no household before first run", async () => {
    const result = await getBootstrap(fakeDb({}));
    expect(result.hasHousehold).toBe(false);
    expect(result.currentMonth).toBe(currentMonth());
    expect(result.setupProgress.every((s) => !s.done)).toBe(true);
  });

  it("reports a household and its progress", async () => {
    const result = await getBootstrap(
      fakeDb({ version: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG } }),
    );
    expect(result.hasHousehold).toBe(true);
    expect(result.setupProgress.filter((s) => s.done).map((s) => s.id)).toEqual([
      "rentAndRooms",
      "people",
      "yourSplit",
    ]);
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
