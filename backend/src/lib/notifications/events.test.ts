import { EVENT_TRIGGERS, plannedNotificationSchema, type NotificationGroupSwitches } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { EVENT_DRAFTS, eventNotifications, expiredEventIds, type PlanEvent } from "./events";
import { NOTIFICATION_TRIGGERS } from "./registry";
import { NOTIFICATION_TYPE_ROWS } from "./rows";

const NOW = new Date("2026-11-29T14:03:00+08:00");
const FYI_ON: NotificationGroupSwitches = { uploadBill: false, collectPayments: false, payBill: false, fyi: true };
const FYI_OFF: NotificationGroupSwitches = { ...FYI_ON, fyi: false };

/** A pending settled event raised a minute before now, with the given changes. */
const event = (over: Partial<PlanEvent> = {}): PlanEvent => ({
  id: "e1",
  key: "settled:2026-11:2026-11-29",
  typeKey: "monthSettled",
  params: { month: "November" },
  status: "PENDING",
  createdAt: new Date("2026-11-29T14:02:00+08:00"),
  fireAt: null,
  ...over,
});

const list = (events: PlanEvent[], switches = FYI_ON) => eventNotifications(NOW, switches, NOTIFICATION_TYPE_ROWS, events);

describe("EVENT_DRAFTS", () => {
  it("keys a settled month by month and Singapore date, so settling again on another day fires again", () => {
    expect(EVENT_DRAFTS["month-settled"]({ month: "2026-11", day: "2026-11-29" })).toEqual({
      key: "settled:2026-11:2026-11-29",
      params: { month: "November" },
    });
  });

  it("keys an unusual bill by month only, with the amount and the change as text", () => {
    expect(
      EVENT_DRAFTS["unusual-bill"]({ month: "2026-12", amountCents: 54400, change: { percent: 32, direction: "higher" } }),
    ).toEqual({ key: "unusual:2026-12", params: { month: "December", amount: "$544.00", change: "32% higher" } });
  });

  it("fills exactly the placeholders each trigger's registry entry names", () => {
    const facts = {
      "month-settled": { month: "2026-11", day: "2026-11-29" },
      "unusual-bill": { month: "2026-12", amountCents: 100, change: { percent: 30, direction: "lower" as const } },
    };
    for (const trigger of EVENT_TRIGGERS) {
      const draft = (EVENT_DRAFTS[trigger] as (f: unknown) => { params: Record<string, string> })(facts[trigger]);
      expect(Object.keys(draft.params).sort()).toEqual([...NOTIFICATION_TRIGGERS[trigger].placeholders].sort());
    }
  });
});

describe("eventNotifications", () => {
  it("sets a pending event to fire five seconds out, asking to be acknowledged, its id the event key", () => {
    const [n] = list([event()]);
    expect(plannedNotificationSchema.parse(n)).toEqual({
      id: "settled:2026-11:2026-11-29",
      channel: "fyi",
      title: "November is settled",
      body: "Everyone has paid and the utilities bill is covered.",
      at: "2026-11-29T14:03:05+08:00",
      tap: null,
      actions: [],
      acknowledge: true,
    });
  });

  it("fills the unusual bill's text from its stored params", () => {
    const [n] = list([
      event({
        key: "unusual:2026-12",
        typeKey: "unusualBill",
        params: { month: "December", amount: "$544.00", change: "32% higher" },
      }),
    ]);
    expect([n.title, n.body]).toEqual(["Unusual bill amount", "December’s $544.00 bill is 32% higher than your recent bills."]);
  });

  it("keeps an acknowledged event at the time the phone gave, until it passes", () => {
    const scheduled = event({ status: "SCHEDULED", fireAt: new Date("2026-11-29T14:03:20+08:00") });
    expect(list([scheduled]).map((n) => [n.at, n.acknowledge])).toEqual([["2026-11-29T14:03:20+08:00", false]]);
    expect(list([{ ...scheduled, fireAt: new Date("2026-11-29T14:02:59+08:00") }])).toEqual([]);
  });

  it("leaves out events with FYI updates off, of an unknown type, or pending for more than 3 days", () => {
    expect(list([event()], FYI_OFF)).toEqual([]);
    expect(list([event({ typeKey: "gone" })])).toEqual([]);
    expect(list([event({ typeKey: "uploadBill" })])).toEqual([]);
    expect(list([event({ createdAt: new Date("2026-11-26T14:02:59+08:00") })])).toEqual([]);
    expect(list([event({ createdAt: new Date("2026-11-26T14:03:00+08:00") })])).toHaveLength(1);
  });
});

describe("expiredEventIds", () => {
  it("expires pending events older than their type's 3 days, whatever the switches, never scheduled ones", () => {
    const old = new Date("2026-11-26T14:02:00+08:00");
    expect(
      expiredEventIds(NOW, NOTIFICATION_TYPE_ROWS, [
        event({ id: "old", createdAt: old }),
        event({ id: "fresh" }),
        event({ id: "acked", createdAt: old, status: "SCHEDULED", fireAt: new Date("2026-11-30T00:00:00+08:00") }),
      ]),
    ).toEqual(["old"]);
  });
});
