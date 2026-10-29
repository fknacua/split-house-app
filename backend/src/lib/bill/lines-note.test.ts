import { describe, expect, it } from "vitest";
import { buildLinesNote } from "./lines-note";

const LINES = [
  { label: "Electricity", cents: 21000 },
  { label: "Gas", cents: 5000 },
  { label: "Water", cents: 7000 },
  { label: "Refuse Removal", cents: 2000 },
];
const SUBTOTAL = 35000;

describe("buildLinesNote", () => {
  it("says nothing when the lines add up to the Subtotal", () => {
    expect(buildLinesNote(SUBTOTAL, LINES)).toBeNull();
  });

  it("warns with the difference when the lines are less than the Subtotal", () => {
    const lines = [...LINES.slice(0, 3), { label: "Refuse Removal", cents: 550 }];
    expect(buildLinesNote(SUBTOTAL, lines)).toEqual({
      title: "Lines don’t add up to the Subtotal",
      message:
        "Lines total $335.50, which is $14.50 less than the Subtotal. You can still save; the split uses Current Charges.",
    });
  });

  it("warns when the lines are more than the Subtotal", () => {
    expect(buildLinesNote(34000, LINES)?.message).toBe(
      "Lines total $350.00, which is $10.00 more than the Subtotal. You can still save; the split uses Current Charges.",
    );
  });

  it("is one cent off is still a warning", () => {
    expect(buildLinesNote(SUBTOTAL + 1, LINES)?.title).toBe("Lines don’t add up to the Subtotal");
  });

  it("has nothing to say without a Subtotal or without lines", () => {
    expect(buildLinesNote(null, LINES)).toBeNull();
    expect(buildLinesNote(SUBTOTAL, [])).toBeNull();
  });

  it("has nothing to say while a line has no amount (the missing-amount note covers that)", () => {
    expect(buildLinesNote(SUBTOTAL, [...LINES, { label: "Gas", cents: null }])).toBeNull();
  });
});
