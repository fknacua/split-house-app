import { describe, expect, it } from "vitest";
import { deriveMonthStatus, isMonthSettled } from "./derive-month-status";

describe("deriveMonthStatus", () => {
  it("is bill_missing while no bill is saved and no draft is waiting", () => {
    expect(deriveMonthStatus({ hasBill: false, hasDraft: false, unsentMessages: 0, settled: false })).toBe(
      "bill_missing",
    );
  });

  it("is draft while an unsaved bill draft is waiting", () => {
    expect(deriveMonthStatus({ hasBill: false, hasDraft: true, unsentMessages: 0, settled: false })).toBe("draft");
  });

  it("is unsent while a saved bill has people with no monthly message", () => {
    expect(deriveMonthStatus({ hasBill: true, hasDraft: false, unsentMessages: 2, settled: false })).toBe("unsent");
  });

  it("ignores a leftover draft once the bill is saved", () => {
    expect(deriveMonthStatus({ hasBill: true, hasDraft: true, unsentMessages: 1, settled: false })).toBe("unsent");
  });

  it("is collecting once every message is out, whatever is paid", () => {
    expect(deriveMonthStatus({ hasBill: true, hasDraft: false, unsentMessages: 0, settled: false })).toBe(
      "collecting",
    );
  });

  it("is settled once everything is paid", () => {
    expect(deriveMonthStatus({ hasBill: true, hasDraft: false, unsentMessages: 0, settled: true })).toBe("settled");
  });
});

describe("isMonthSettled", () => {
  const owners = new Set(["alex"]);
  const paidBill = { paidCents: 41230 };

  it("is true when every non-owner charge and the bill are paid", () => {
    const charges = [
      { personId: "jordan", paidCents: 95000 },
      { personId: "priya", paidCents: 12345 },
    ];
    expect(isMonthSettled(charges, owners, paidBill)).toBe(true);
  });

  it("ignores the owner's own unpaid charges", () => {
    const charges = [
      { personId: "alex", paidCents: null },
      { personId: "jordan", paidCents: 95000 },
    ];
    expect(isMonthSettled(charges, owners, paidBill)).toBe(true);
  });

  it("counts a short payment as paid", () => {
    expect(isMonthSettled([{ personId: "jordan", paidCents: 100 }], owners, paidBill)).toBe(true);
  });

  it("is false while any non-owner charge is unpaid", () => {
    const charges = [
      { personId: "jordan", paidCents: 95000 },
      { personId: "priya", paidCents: null },
    ];
    expect(isMonthSettled(charges, owners, paidBill)).toBe(false);
  });

  it("is false while the bill is unpaid or not saved", () => {
    const charges = [{ personId: "jordan", paidCents: 95000 }];
    expect(isMonthSettled(charges, owners, { paidCents: null })).toBe(false);
    expect(isMonthSettled(charges, owners, null)).toBe(false);
  });
});
