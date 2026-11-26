import { describe, expect, it } from "vitest";
import { NOTIFICATION_TYPE_ROWS } from "./rows";
import { readNotificationTypes } from "./types";

describe("readNotificationTypes", () => {
  it("reads the seeded rows, by key", () => {
    expect(readNotificationTypes([...NOTIFICATION_TYPE_ROWS].reverse()).map((t) => t.key)).toEqual(
      [...NOTIFICATION_TYPE_ROWS].map((t) => t.key).sort(),
    );
  });

  it("refuses a row with an unknown group, kind or rule", () => {
    const [upload] = NOTIFICATION_TYPE_ROWS;
    expect(() => readNotificationTypes([{ ...upload, groupKey: "collectRent" }])).toThrow();
    expect(() => readNotificationTypes([{ ...upload, kind: "weekly" }])).toThrow();
    expect(() => readNotificationTypes([{ ...upload, rule: { ...upload.rule, anchor: "rent-day" } }])).toThrow();
  });
});
