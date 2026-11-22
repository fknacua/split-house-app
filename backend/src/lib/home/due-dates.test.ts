import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { chargeDueDate } from "./due-dates";

const MONTH = "2026-11";

// Priya keeps an aircon day stored by an older version, which must not be read.
const CONFIG = {
  ...NOV_2026_CONFIG,
  people: NOV_2026_CONFIG.people.map((p) =>
    p.personId === PERSON_IDS.priya ? { ...p, dueDays: { ...p.dueDays, AIRCON: 3 } } : p,
  ),
};

describe("chargeDueDate", () => {
  it("uses the charge's stored date first", () => {
    const charge = { category: "AIRCON" as const, dueDate: new Date("2026-11-20"), payViaPersonId: PERSON_IDS.priya };
    expect(chargeDueDate(MONTH, CONFIG, charge)).toBe("2026-11-20");
  });

  it("uses the payer's utilities day for a routed charge with no date", () => {
    const charge = { category: "UTILITIES" as const, dueDate: null, payViaPersonId: PERSON_IDS.priya };
    expect(chargeDueDate(MONTH, CONFIG, charge)).toBe("2026-11-07");
  });

  it.each(["AIRCON", "ONE_OFF", "RECURRING"] as const)("reads no day for a routed %s charge with no date", (category) => {
    expect(chargeDueDate(MONTH, CONFIG, { category, dueDate: null, payViaPersonId: PERSON_IDS.priya })).toBeNull();
  });

  it("has no date for a direct charge stored without one", () => {
    expect(chargeDueDate(MONTH, CONFIG, { category: "RENT", dueDate: null, payViaPersonId: null })).toBeNull();
  });
});
