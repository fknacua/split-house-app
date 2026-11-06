import { describe, expect, it } from "vitest";
import { doneStepsOf, requiredStepsDone, requireStepsBefore } from "./steps";

describe("doneStepsOf", () => {
  it("keeps known steps in step order, once each", () => {
    expect(doneStepsOf(["people", "startMonth", "reminders", "people", "rentAndRooms"])).toEqual([
      "startMonth",
      "rentAndRooms",
      "people",
    ]);
  });
});

describe("requiredStepsDone", () => {
  it("needs the four required steps, not Custom messages", () => {
    expect(requiredStepsDone(["startMonth", "rentAndRooms", "people"])).toBe(false);
    expect(requiredStepsDone(["startMonth", "rentAndRooms", "people", "householdSplits"])).toBe(true);
  });
});

describe("requireStepsBefore", () => {
  it("allows Start month with nothing done", () => {
    expect(() => requireStepsBefore("startMonth", [])).not.toThrow();
  });

  it.each([
    ["rentAndRooms", [], "start_month_first", "Choose the start month first."],
    ["people", ["startMonth"], "rooms_first", "Save Rent & rooms first."],
    ["householdSplits", ["startMonth", "rentAndRooms"], "people_first", "Save people first."],
    ["messages", ["startMonth", "rentAndRooms", "people"], "splits_first", "Save Household splits first."],
  ] as const)("refuses %s with the first earlier step not done", (step, done, code, message) => {
    expect(() => requireStepsBefore(step, done)).toThrow(expect.objectContaining({ status: 409, code, message }));
  });

  it("allows Custom messages once the four required steps are done", () => {
    expect(() => requireStepsBefore("messages", ["startMonth", "rentAndRooms", "people", "householdSplits"])).not.toThrow();
  });
});
