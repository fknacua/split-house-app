import { describe, expect, it } from "vitest";
import { setupStartMonthResponseSchema } from "@splithouse/shared";
import { buildStartMonthPage, effectiveStartMonth } from "./start-month";

describe("effectiveStartMonth", () => {
  it.each([
    [null, "2026-11"],
    ["2026-10", "2026-11"],
    ["2026-11", "2026-11"],
    ["2027-03", "2027-03"],
  ])("reads %s as %s in November 2026", (saved, expected) => {
    expect(effectiveStartMonth(saved, "2026-11")).toBe(expected);
  });
});

describe("buildStartMonthPage", () => {
  it("draws `default` with nothing saved: This month selected, with the overdue note after the 1st", () => {
    const page = buildStartMonthPage({ today: "2026-11-07", saved: null });
    expect(setupStartMonthResponseSchema.parse(page)).toEqual({
      options: [
        { id: "this", kicker: "This month", month: "2026-11", title: "November 2026", note: "Due dates before today start as overdue" },
        { id: "next", kicker: "Next month", month: "2026-12", title: "December 2026", note: null },
        { id: "other", kicker: "Another month", month: null, title: "Choose from the calendar", note: null },
      ],
      selected: "this",
      pickerFrom: "2027-01",
      startMonth: null,
    });
  });

  it("leaves the overdue note off on the 1st", () => {
    const page = buildStartMonthPage({ today: "2026-12-01", saved: null });
    expect(page.options[0]).toMatchObject({ month: "2026-12", note: null });
  });

  it("draws `next` when next month is saved", () => {
    const page = buildStartMonthPage({ today: "2026-11-07", saved: "2026-12" });
    expect(page.selected).toBe("next");
    expect(page.options[2].month).toBeNull();
    expect(page.startMonth).toBe("2026-12");
  });

  it("draws `far` with a later month on card 3", () => {
    const page = buildStartMonthPage({ today: "2026-11-07", saved: "2027-01" });
    expect(page.selected).toBe("other");
    expect(page.options[2]).toEqual({ id: "other", kicker: "Another month", month: "2027-01", title: "January 2027", note: null });
  });

  it("reads a saved month now in the past as This month", () => {
    const page = buildStartMonthPage({ today: "2026-12-03", saved: "2026-11" });
    expect(page.selected).toBe("this");
    expect(page.startMonth).toBe("2026-12");
  });

  it("crosses the year for next month and the picker", () => {
    const page = buildStartMonthPage({ today: "2026-12-15", saved: null });
    expect(page.options.map((o) => o.month)).toEqual(["2026-12", "2027-01", null]);
    expect(page.pickerFrom).toBe("2027-02");
  });
});
