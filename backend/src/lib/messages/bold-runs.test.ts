import { describe, expect, it } from "vitest";
import { boldRuns } from "./bold-runs";

const plain = (text: string) => ({ text, bold: false });
const bold = (text: string) => ({ text, bold: true });

describe("boldRuns", () => {
  it("drops the markers around bold text", () => {
    expect(boldRuns("*Total:* $1,963.65")).toEqual([bold("Total:"), plain(" $1,963.65")]);
  });

  it("keeps plain text and line breaks in one piece", () => {
    expect(boldRuns("Hi Sam!\n\nBy 7 Nov")).toEqual([plain("Hi Sam!\n\nBy 7 Nov")]);
  });

  it("reads several bold pieces, and one that ends a line", () => {
    expect(boldRuns("*Hi* Sam, *pay*\nnow")).toEqual([bold("Hi"), plain(" Sam, "), bold("pay"), plain("\nnow")]);
  });

  it("reads a single character and bold after punctuation", () => {
    expect(boldRuns("(*a*)")).toEqual([plain("("), bold("a"), plain(")")]);
  });

  it.each([
    ["a space after the opening marker", "* Total*"],
    ["a space before the closing marker", "*Total *"],
    ["a letter before the opening marker", "a*b* c"],
    ["a letter after the closing marker", "*b*c"],
    ["a line break inside", "*Total\nnow*"],
    ["nothing inside", "** and ***"],
    ["a lone marker", "5 * 3"],
  ])("leaves the asterisks as typed with %s", (_, text) => {
    expect(boldRuns(text)).toEqual([plain(text)]);
  });

  it("returns nothing for empty text", () => {
    expect(boldRuns("")).toEqual([]);
  });
});
