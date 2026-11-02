import { TENANT_PERSON_COLORS } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { nextPersonColor } from "./person-color";

describe("nextPersonColor", () => {
  it("starts at Blue", () => {
    expect(nextPersonColor([])).toBe("BLUE");
  });

  it("takes the first unused color, as the sample household does", () => {
    expect(nextPersonColor(["TEAL", "BLUE", "ORANGE", "GREEN"])).toBe("PURPLE");
  });

  it("never offers Teal", () => {
    expect(TENANT_PERSON_COLORS).not.toContain("TEAL");
    expect(nextPersonColor(["BLUE", "ORANGE", "GREEN", "PURPLE", "PINK"])).toBe("GOLD");
  });

  it("falls back to Blue when all are taken", () => {
    expect(nextPersonColor(TENANT_PERSON_COLORS)).toBe("BLUE");
  });
});
