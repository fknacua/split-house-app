import { afterEach, describe, expect, it, vi } from "vitest";
import { currentMonth } from "./month";

afterEach(() => {
  vi.unstubAllEnvs();
});

// The Singapore month rules (monthKeyOf and the rest) are tested in shared/src/lib/month.test.ts.
describe("currentMonth", () => {
  it("follows DEV_NOW outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
    expect(currentMonth()).toBe("2026-11");
  });
});
