import { describe, expect, it } from "vitest";
import { notificationGroupSwitches, readNotificationGroups } from "./groups";
import { NOTIFICATION_GROUP_ROWS } from "./rows";

describe("readNotificationGroups", () => {
  it("reads the stored rows by sortOrder", () => {
    const stored = [...NOTIFICATION_GROUP_ROWS].reverse().map((g, i) => ({ ...g, sortOrder: i + 1 }));
    expect(readNotificationGroups(stored).map((g) => g.key)).toEqual(["fyi", "payBill", "collectPayments", "uploadBill"]);
  });

  it("keeps what is stored over the seeded values", () => {
    const stored = NOTIFICATION_GROUP_ROWS.map((g) => (g.key === "payBill" ? { ...g, label: "Pay it", enabled: false } : g));
    expect(readNotificationGroups(stored).find((g) => g.key === "payBill")).toMatchObject({
      label: "Pay it",
      enabled: false,
    });
  });

  it("ignores a key the code doesn't know", () => {
    const stored = [...NOTIFICATION_GROUP_ROWS, { ...NOTIFICATION_GROUP_ROWS[0], key: "collectRent", sortOrder: 0 }];
    expect(readNotificationGroups(stored).map((g) => g.key)).toEqual(["uploadBill", "collectPayments", "payBill", "fyi"]);
  });

  it("gives a switch with no row its seeded values", () => {
    expect(readNotificationGroups([])).toEqual(NOTIFICATION_GROUP_ROWS);
  });
});

describe("notificationGroupSwitches", () => {
  it("gives one boolean per switch", () => {
    expect(notificationGroupSwitches(NOTIFICATION_GROUP_ROWS)).toEqual({
      uploadBill: true,
      collectPayments: true,
      payBill: true,
      fyi: false,
    });
  });
});
