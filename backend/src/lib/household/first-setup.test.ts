import { describe, expect, it } from "vitest";

import { firstSetupGroups } from "./first-setup";

const groups = [
  { title: "Saves now", rows: [{ label: "Name", from: "Sam", to: "Sammy" }] },
  { title: "Saves from Dec 2026", rows: [{ label: "Rent due date", from: "1st", to: "5th" }] },
];

describe("firstSetupGroups", () => {
  it("keeps the titled groups once a month is open", () => {
    expect(firstSetupGroups(groups, false)).toBe(groups);
  });

  it("puts every row under one untitled group in First run", () => {
    expect(firstSetupGroups(groups, true)).toEqual([
      {
        title: null,
        rows: [
          { label: "Name", from: "Sam", to: "Sammy" },
          { label: "Rent due date", from: "1st", to: "5th" },
        ],
      },
    ]);
  });

  it("has no group when there is nothing to show", () => {
    expect(firstSetupGroups([], true)).toEqual([]);
  });
});
