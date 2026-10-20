import { afterEach, describe, expect, it, vi } from "vitest";
import { now } from "./now";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("now", () => {
  it("returns the real time when DEV_NOW is unset", () => {
    vi.stubEnv("DEV_NOW", "");
    const before = Date.now();
    const result = now().getTime();
    expect(result).toBeGreaterThanOrEqual(before);
  });

  it("honours DEV_NOW outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
    expect(now().toISOString()).toBe("2026-11-03T01:00:00.000Z");
  });

  it("ignores DEV_NOW in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
    const before = Date.now();
    expect(now().getTime()).toBeGreaterThanOrEqual(before);
  });
});
