import { afterEach, describe, expect, it, vi } from "vitest";
import { currentMonth, monthKeyOf } from "./month";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("monthKeyOf", () => {
  it("uses Singapore time, not UTC", () => {
    // 16:30 UTC on 31 Oct is 00:30 on 1 Nov in Singapore.
    expect(monthKeyOf(new Date("2026-10-31T16:30:00Z"))).toBe("2026-11");
    expect(monthKeyOf(new Date("2026-10-31T15:59:00Z"))).toBe("2026-10");
  });

  it("rolls over the year", () => {
    expect(monthKeyOf(new Date("2026-12-31T16:00:00Z"))).toBe("2027-01");
  });
});

describe("currentMonth", () => {
  it("follows DEV_NOW outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
    expect(currentMonth()).toBe("2026-11");
  });
});
