import { describe, expect, it } from "vitest";
import { deriveMonthStatus } from "./derive-month-status";

describe("deriveMonthStatus", () => {
  it("is bill_missing while no bill is saved", () => {
    expect(deriveMonthStatus({ hasBill: false })).toBe("bill_missing");
  });

  it("throws once a bill exists, until the later statuses are built", () => {
    expect(() => deriveMonthStatus({ hasBill: true })).toThrow();
  });
});
