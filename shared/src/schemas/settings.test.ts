import { describe, expect, it } from "vitest";
import { DEFAULT_NOTIFICATIONS, parseNotificationSettings } from "./settings";

describe("parseNotificationSettings", () => {
  it("uses the design defaults when there is no row", () => {
    expect(parseNotificationSettings(undefined)).toEqual(DEFAULT_NOTIFICATIONS);
    expect(DEFAULT_NOTIFICATIONS).toEqual({
      upload: true,
      tenant1: true,
      savings: true,
      paysp: true,
      checks: true,
      fyi: false,
    });
  });

  it("keeps stored toggles and fills in the missing ones", () => {
    expect(parseNotificationSettings({ upload: false, fyi: true })).toEqual({
      ...DEFAULT_NOTIFICATIONS,
      upload: false,
      fyi: true,
    });
  });

  it("falls back to the defaults for a value it cannot read", () => {
    expect(parseNotificationSettings({ upload: "yes" })).toEqual(DEFAULT_NOTIFICATIONS);
    expect(parseNotificationSettings("nope")).toEqual(DEFAULT_NOTIFICATIONS);
  });
});
