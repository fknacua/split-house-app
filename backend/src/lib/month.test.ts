import { afterEach, describe, expect, it, vi } from "vitest";
import { activeMonthOf, currentMonth } from "./month";

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

describe("activeMonthOf", () => {
  const at = new Date("2026-11-27T09:00:00+08:00");

  it("is the calendar month with nothing opened, or with only earlier months", () => {
    expect(activeMonthOf([], at)).toBe("2026-11");
    expect(activeMonthOf(["2026-10", "2026-11"], at)).toBe("2026-11");
    expect(activeMonthOf(["2026-10"], at)).toBe("2026-11");
  });

  it("is a month started early, ahead of the calendar", () => {
    expect(activeMonthOf(["2026-12", "2026-11"], at)).toBe("2026-12");
  });
});
