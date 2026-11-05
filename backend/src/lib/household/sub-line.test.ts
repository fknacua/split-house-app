import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { personRouteLine, personSubLine } from "./sub-line";

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

describe("personSubLine", () => {
  it("reads the room from the role and the routes", () => {
    expect(personSubLine(NOV_2026_CONFIG, priya, NAMES)).toBe("Master room · pays you directly");
    expect(personSubLine(NOV_2026_CONFIG, sam, NAMES)).toBe("Own room · utilities and aircon via Priya");
    expect(personSubLine(NOV_2026_CONFIG, jordan, NAMES)).toBe("Own room · pays you directly");
  });

  it("says the owner pays the landlord and utilities", () => {
    expect(personSubLine(NOV_2026_CONFIG, PERSON_IDS.alex, NAMES)).toBe("Master room · pays landlord & utilities");
  });
});
