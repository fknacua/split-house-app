import { afterEach, describe, expect, it, vi } from "vitest";
import { bootstrapResponseSchema } from "@splithouse/shared";
import { currentMonth } from "@/lib/month";
import { getBootstrap, type BootstrapDb } from "./bootstrap.service";

function fakeDb(opts: { hasVersion?: boolean; newestMonth?: string }): BootstrapDb {
  return {
    householdVersion: { findFirst: async () => (opts.hasVersion ? { id: "v1" } : null) },
    month: { findFirst: async () => (opts.newestMonth ? { month: opts.newestMonth } : null) },
  };
}

afterEach(() => vi.unstubAllEnvs());

describe("getBootstrap", () => {
  it("says there is no household and setup is not complete before first run", async () => {
    const result = await getBootstrap(fakeDb({}));
    expect(result).toEqual({ hasHousehold: false, setupComplete: false, currentMonth: currentMonth() });
  });

  it("keeps setup incomplete while a version exists but no month is open", async () => {
    const result = await getBootstrap(fakeDb({ hasVersion: true }));
    expect(result.hasHousehold).toBe(true);
    expect(result.setupComplete).toBe(false);
  });

  it("reports setup complete once a month is open", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
    const result = await getBootstrap(fakeDb({ hasVersion: true, newestMonth: "2026-11" }));
    expect(result).toEqual({ hasHousehold: true, setupComplete: true, currentMonth: "2026-11" });
  });

  it("reports a month started early as the current month", async () => {
    vi.stubEnv("DEV_NOW", "2026-11-29T09:00:00+08:00");
    const result = await getBootstrap(fakeDb({ hasVersion: true, newestMonth: "2026-12" }));
    expect(result.currentMonth).toBe("2026-12");
  });

  it("matches the shared response schema the app reads", async () => {
    expect(bootstrapResponseSchema.safeParse(await getBootstrap(fakeDb({}))).success).toBe(true);
    const complete = await getBootstrap(fakeDb({ hasVersion: true, newestMonth: "2026-11" }));
    expect(bootstrapResponseSchema.safeParse(complete).success).toBe(true);
  });
});
