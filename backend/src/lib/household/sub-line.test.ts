import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { personRouteLine } from "./sub-line";

const { priya, sam, jordan } = PERSON_IDS;

const NAMES = new Map<string, string>([
  [priya, "Priya"],
  [sam, "Sam"],
  [jordan, "Jordan"],
]);

describe("personRouteLine", () => {
  it("says how the person pays, with no room", () => {
    expect(personRouteLine(NOV_2026_CONFIG, priya, NAMES)).toBe("Pays you directly");
    expect(personRouteLine(NOV_2026_CONFIG, sam, NAMES)).toBe("Utilities and aircon via Priya");
    expect(personRouteLine(NOV_2026_CONFIG, jordan, NAMES)).toBe("Pays you directly");
  });
});
