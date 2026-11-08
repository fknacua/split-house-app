import { describe, expect, it } from "vitest";

import { changedRows } from "./summary-rows";

describe("changedRows", () => {
  it("drops what did not change", () => {
    expect(changedRows([{ label: "Rent amount", from: "$100.00", to: "$100.00" }])).toEqual([]);
  });

  it("leaves no before value where there was none, and keeps a cleared value", () => {
    expect(
      changedRows([
        { label: "Room 4", from: "—", to: "Added" },
        { label: "Utilities due date", from: "16th", to: "—" },
      ]),
    ).toEqual([
      { label: "Room 4", from: null, to: "Added" },
      { label: "Utilities due date", from: "16th", to: "—" },
    ]);
  });
});
