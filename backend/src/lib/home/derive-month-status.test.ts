import { describe, expect, it } from "vitest";
import { deriveMonthStatus } from "./derive-month-status";

describe("deriveMonthStatus", () => {
  it("is bill_missing while no bill is saved and no draft is waiting", () => {
    expect(deriveMonthStatus({ hasBill: false, hasDraft: false })).toBe("bill_missing");
  });

  it("is draft while an unsaved bill draft is waiting", () => {
    expect(deriveMonthStatus({ hasBill: false, hasDraft: true })).toBe("draft");
  });

  it("throws once a bill exists, until the later statuses are built", () => {
    expect(() => deriveMonthStatus({ hasBill: true, hasDraft: false })).toThrow();
  });
});
