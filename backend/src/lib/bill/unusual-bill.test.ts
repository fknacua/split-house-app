import { describe, expect, it } from "vitest";
import { buildUnusualBillWarning } from "./unusual-bill";

// An average of $400.00.
const RECENT = [38000, 40000, 42000];

describe("buildUnusualBillWarning", () => {
  it.each([
    ["well above", 56000, "This bill is 40% higher than your recent bills."],
    ["well below", 24000, "This bill is 40% lower than your recent bills."],
    ["just over the threshold above", 50100, "This bill is 25% higher than your recent bills."],
    ["just over the threshold below", 29900, "This bill is 25% lower than your recent bills."],
  ])("warns when the bill is %s the average", (_name, current, expected) => {
    expect(buildUnusualBillWarning(current, RECENT)).toBe(expected);
  });

  it.each([
    ["the average", 40000],
    ["exactly 25% above", 50000],
    ["exactly 25% below", 30000],
    ["a little above", 45000],
  ])("says nothing for %s", (_name, current) => {
    expect(buildUnusualBillWarning(current, RECENT)).toBeNull();
  });

  it("rounds the percentage to a whole number", () => {
    expect(buildUnusualBillWarning(51234, RECENT)).toBe("This bill is 28% higher than your recent bills.");
  });

  it("uses the bills there are when fewer than three are saved", () => {
    expect(buildUnusualBillWarning(60000, [40000])).toBe("This bill is 50% higher than your recent bills.");
    expect(buildUnusualBillWarning(41000, [40000, 40000])).toBeNull();
  });

  it("says nothing without history, without an amount, or for an amount that is not above zero", () => {
    expect(buildUnusualBillWarning(60000, [])).toBeNull();
    expect(buildUnusualBillWarning(null, RECENT)).toBeNull();
    expect(buildUnusualBillWarning(0, RECENT)).toBeNull();
  });
});
