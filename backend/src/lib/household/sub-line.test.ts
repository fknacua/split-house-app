import { describe, expect, it } from "vitest";
import { joinWords } from "./sub-line";

describe("joinWords", () => {
  it("joins words the way a sentence does", () => {
    expect(joinWords([])).toBe("");
    expect(joinWords(["Sam"])).toBe("Sam");
    expect(joinWords(["Sam", "Jordan"])).toBe("Sam and Jordan");
    expect(joinWords(["Priya", "Sam", "Jordan"], "or")).toBe("Priya, Sam or Jordan");
  });
});
