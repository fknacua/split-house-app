import { describe, expect, it } from "vitest";
import { deriveMonthStatus } from "./derive-month-status";

describe("deriveMonthStatus", () => {
  it("is bill_missing while no bill is saved and no draft is waiting", () => {
    expect(deriveMonthStatus({ hasBill: false, hasDraft: false, unsentMessages: 0 })).toBe("bill_missing");
  });

  it("is draft while an unsaved bill draft is waiting", () => {
    expect(deriveMonthStatus({ hasBill: false, hasDraft: true, unsentMessages: 0 })).toBe("draft");
  });

  it("is unsent while a saved bill has people with no monthly message", () => {
    expect(deriveMonthStatus({ hasBill: true, hasDraft: false, unsentMessages: 2 })).toBe("unsent");
  });

  it("ignores a leftover draft once the bill is saved", () => {
    expect(deriveMonthStatus({ hasBill: true, hasDraft: true, unsentMessages: 1 })).toBe("unsent");
  });

  it("is collecting once every message is out, whatever is paid", () => {
    expect(deriveMonthStatus({ hasBill: true, hasDraft: false, unsentMessages: 0 })).toBe("collecting");
  });
});
