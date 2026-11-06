import { describe, expect, it } from "vitest";
import { setupResponseSchema, type SetupStepId } from "@splithouse/shared";
import { buildWelcome } from "./build-welcome";

const REQUIRED: SetupStepId[] = ["startMonth", "rentAndRooms", "people", "householdSplits"];
const states = (done: SetupStepId[]) => buildWelcome(done).rows.map((r) => r.state);

describe("buildWelcome", () => {
  it("draws `empty`: no progress, Start month current, later rows disabled, no link", () => {
    const welcome = setupResponseSchema.parse(buildWelcome([]));
    expect(welcome.heading).toBe("Set up your household");
    expect(welcome.intro).toBe(
      "Tell the app who lives here and what everyone pays. You only do this once — after that it’s one bill a month.",
    );
    expect(welcome.progress).toBeNull();
    expect(welcome.rows.map((r) => [r.number, r.title, r.optional])).toEqual([
      ["1", "Start month", false],
      ["2", "Rent & rooms", false],
      ["3", "People", false],
      ["4", "Household splits", false],
      ["5", "Custom messages", true],
    ]);
    expect(welcome.rows[0].detail).toBe("Choose the first month you want to track");
    expect(states([])).toEqual(["current", "disabled", "disabled", "disabled", "disabled"]);
    expect(welcome.primary).toEqual({ label: "Start with the start month", target: { kind: "start-month" } });
    expect(welcome.secondary).toBeNull();
  });

  it("draws `started`: one of five done, Continue to Rent & rooms", () => {
    const welcome = buildWelcome(["startMonth"]);
    expect(welcome.progress).toEqual({
      text: "1 of 5 steps done",
      note: null,
      done: 1,
      segments: [
        { optional: false, done: true },
        { optional: false, done: false },
        { optional: false, done: false },
        { optional: false, done: false },
        { optional: true, done: false },
      ],
    });
    expect(states(["startMonth"])).toEqual(["done", "current", "disabled", "disabled", "disabled"]);
    expect(welcome.primary).toEqual({ label: "Continue: Rent & rooms", target: { kind: "edit-home" } });
    expect(welcome.secondary).toBeNull();
  });

  it("draws `progress`: three done, Continue to Household splits", () => {
    const welcome = buildWelcome(["startMonth", "rentAndRooms", "people"]);
    expect(welcome.heading).toBe("Set up your household");
    expect(welcome.progress?.text).toBe("3 of 5 steps done");
    expect(welcome.primary).toEqual({ label: "Continue: Household splits", target: { kind: "edit-splits" } });
  });

  it("draws `optional`: the required steps done, Continue to Custom messages or finish with Not now", () => {
    const welcome = setupResponseSchema.parse(buildWelcome(REQUIRED));
    expect(welcome.heading).toBe("Your household is set up");
    expect(welcome.intro).toBe("Custom messages are optional. You can change them any time in Settings.");
    expect(welcome.progress?.text).toBe("4 of 5 steps done");
    expect(states(REQUIRED)).toEqual(["done", "done", "done", "done", "current"]);
    expect(welcome.primary).toEqual({ label: "Continue: Custom messages", target: { kind: "setup-messages" } });
    expect(welcome.secondary).toEqual({ label: "Not now", target: { kind: "finish", then: "home" } });
  });

  it("draws `allDone`: upload the first bill, or finish without one", () => {
    const welcome = setupResponseSchema.parse(buildWelcome([...REQUIRED, "messages"]));
    expect(welcome.heading).toBe("You’re all set");
    expect(welcome.intro).toBe("Everything is set up. Next, upload your utilities bill if you have one already.");
    expect(welcome.progress).toMatchObject({ text: "All steps done", note: "Optional steps included", done: 5 });
    expect(welcome.progress?.segments.every((s) => s.done)).toBe(true);
    expect(welcome.rows.every((r) => r.state === "done")).toBe(true);
    expect(welcome.primary).toEqual({
      label: "Upload your first utilities bill",
      target: { kind: "finish", then: "bill-upload" },
    });
    expect(welcome.secondary).toEqual({ label: "I don’t have a bill yet", target: { kind: "finish", then: "home" } });
  });

  it("gives each row its own target", () => {
    expect(buildWelcome([]).rows.map((r) => r.target.kind)).toEqual([
      "start-month",
      "edit-home",
      "setup-people",
      "edit-splits",
      "setup-messages",
    ]);
  });
});
