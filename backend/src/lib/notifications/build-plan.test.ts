import { describe, expect, it } from "vitest";
import { plannedNotificationSchema, type NotificationGroupKey, type NotificationGroupSwitches } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS, VERSION_A_CONFIG } from "@/lib/fixtures/household";
import {
  buildNotificationPlan,
  uploadMonths,
  type PlanBill,
  type PlanCharge,
  type PlanInput,
} from "./build-plan";
import { NOTIFICATION_TYPE_ROWS } from "./rows";

// The Nov 2026 fixtures (Data Model): Priya pays her charges and Sam's utilities on the 7th, Sam's rent is due on the
// 28th, Jordan’s rent on the 1st and his utilities on the 4th, and the bill on the 16th.
const PEOPLE = [
  { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", isOwner: false },
  { id: PERSON_IDS.sam, name: "Sam", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", isOwner: false },
];

const MONTHS = [
  { month: "2026-10", config: VERSION_A_CONFIG },
  { month: "2026-11", config: NOV_2026_CONFIG },
];

const ALL_ON: NotificationGroupSwitches = { uploadBill: true, collectPayments: true, payBill: true, fyi: true };

/** Only the given switch on, so each table looks at one kind of notification. */
const only = (key: NotificationGroupKey): NotificationGroupSwitches => ({
  uploadBill: false,
  collectPayments: false,
  payBill: false,
  fyi: false,
  [key]: true,
});

/** An unpaid Nov charge of Jordan's, his utilities due 4 Nov, with the given changes. */
const charge = (over: Partial<PlanCharge> & { id: string }): PlanCharge => ({
  month: "2026-11",
  personId: PERSON_IDS.jordan,
  payViaPersonId: null,
  category: "UTILITIES",
  label: "Utilities",
  amountCents: 8246,
  dueDate: new Date("2026-11-04"),
  correctsCharge: null,
  ...over,
});

/** A saved bill of the month, marked paid, so it neither reminds to upload nor to pay. */
const paidBill = (month: string): PlanBill => ({
  month,
  currentChargesCents: 41230,
  dueDate: null,
  paidCents: 41230,
  utilities: [],
});

/** November's bill, not marked paid, with nobody's utilities paid yet. */
const NOV_BILL: PlanBill = {
  month: "2026-11",
  currentChargesCents: 41230,
  dueDate: null,
  paidCents: null,
  utilities: [
    { personId: PERSON_IDS.alex, amountCents: 12369, paidCents: null },
    { personId: PERSON_IDS.priya, amountCents: 12369, paidCents: null },
    { personId: PERSON_IDS.sam, amountCents: 8246, paidCents: null },
    { personId: PERSON_IDS.jordan, amountCents: 8246, paidCents: null },
  ],
};

const plan = (over: Partial<PlanInput>) =>
  buildNotificationPlan({
    now: new Date("2026-11-02T10:00:00+08:00"),
    switches: ALL_ON,
    types: NOTIFICATION_TYPE_ROWS,
    people: PEOPLE,
    months: MONTHS,
    unpaidCharges: [],
    bills: [paidBill("2026-10"), paidBill("2026-11")],
    lastAirconAt: null,
    events: [],
    ...over,
  });

/** Each notification as `id`, `at` (date and time), title and body, for compact tables. */
const brief = (input: Partial<PlanInput>) =>
  plan(input).map((n) => [n.id, n.at.slice(0, 16), n.channel, n.title, n.body]);

describe("buildNotificationPlan", () => {
  it("plans nothing before First run has opened a month", () => {
    expect(plan({ months: [] })).toEqual([]);
  });

  it("answers with notifications that parse with the shared schema, at 08:00, in time order, with unique ids", () => {
    const planned = plan({
      unpaidCharges: [charge({ id: "util-jordan" }), charge({ id: "rent-jordan", category: "RENT", label: "Rent" })],
      bills: [paidBill("2026-10"), NOV_BILL],
      lastAirconAt: new Date("2026-08-15T12:00:00+08:00"),
    });
    expect(planned.length).toBeGreaterThan(10);
    for (const n of planned) {
      expect(plannedNotificationSchema.safeParse(n).success).toBe(true);
      expect(n.at.slice(11)).toBe("08:00:00+08:00");
    }
    const times = planned.map((n) => new Date(n.at).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(planned.map((n) => n.id)).size).toBe(planned.length);
  });

  it("plans only the next 14 days: nothing at or before now, nothing from 14 days on", () => {
    const now = new Date("2026-11-03T08:00:00+08:00");
    const days = plan({ now, switches: only("collectPayments"), unpaidCharges: [charge({ id: "c" })] }).map((n) =>
      n.at.slice(0, 10),
    );
    // Due tomorrow at 08:00 today is not after now; overdue runs to the 16th, the 17th at 08:00 is past the window.
    expect(days[0]).toBe("2026-11-04");
    expect(days.at(-1)).toBe("2026-11-16");
  });

  it("plans nothing with every switch off", () => {
    const off = { uploadBill: false, collectPayments: false, payBill: false, fyi: false };
    expect(
      plan({
        switches: off,
        unpaidCharges: [charge({ id: "c" })],
        bills: [NOV_BILL],
        months: [MONTHS[0]],
        lastAirconAt: new Date("2026-08-15T12:00:00+08:00"),
      }),
    ).toEqual([]);
  });

  it("uses the stored types' times and texts", () => {
    const types = NOTIFICATION_TYPE_ROWS.map((t) =>
      t.kind === "deadline" && t.key === "collectPayments" ?
        {
          ...t,
          rule: {
            ...t.rule,
            time: "07:30",
            stages: { ...t.rule.stages, dueToday: { channel: "action" as const, title: "Pay up, {payer}", body: "{items}" } },
          },
        }
      : t,
    );
    const [today] = plan({ switches: only("collectPayments"), types, unpaidCharges: [charge({ id: "c" })] }).filter(
      (n) => n.id.includes(":dueToday:"),
    );
    expect([today.at, today.channel, today.title, today.body]).toEqual([
      "2026-11-04T07:30:00+08:00",
      "action",
      "Pay up, Jordan",
      "Nov utilities",
    ]);
  });

  describe("Upload utilities bill", () => {
    it("is due tomorrow on the 1st, due today on the 2nd, then overdue every day, tapping to Bill upload", () => {
      const now = new Date("2026-10-30T10:00:00+08:00");
      expect(
        plan({ now, switches: only("uploadBill"), months: [MONTHS[0]], bills: [paidBill("2026-10")] }).map((n) => [
          n.id,
          n.at.slice(0, 10),
          n.channel,
          n.title,
          n.body,
          n.tap,
        ]),
      ).toEqual([
        [
          "uploadBill:dueTomorrow:2026-11:2026-11-01",
          "2026-11-01",
          "checks",
          "Upload November’s utilities bill",
          "It usually lands tomorrow. Tap to upload it once it’s in.",
          { kind: "bill-upload", month: "2026-11" },
        ],
        [
          "uploadBill:dueToday:2026-11:2026-11-02",
          "2026-11-02",
          "checks",
          "Upload November’s utilities bill",
          "It usually lands today. Tap to upload it.",
          { kind: "bill-upload", month: "2026-11" },
        ],
        ...["03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13"].map((d) => [
          `uploadBill:overdue:2026-11:2026-11-${d}`,
          `2026-11-${d}`,
          "action",
          "Upload November’s utilities bill",
          "Not uploaded yet. Tap to upload it.",
          { kind: "bill-upload", month: "2026-11" },
        ]),
      ]);
    });

    it("stops once the month's bill is saved", () => {
      expect(plan({ switches: only("uploadBill"), bills: [paidBill("2026-10"), paidBill("2026-11")] })).toEqual([]);
    });

    it("keeps an opened month overdue after it ends, next to the new month's", () => {
      const now = new Date("2026-12-05T10:00:00+08:00");
      const ids = plan({ now, switches: only("uploadBill"), bills: [paidBill("2026-10")] }).map((n) => n.id);
      expect(ids).toContain("uploadBill:overdue:2026-11:2026-12-06");
      expect(ids).toContain("uploadBill:overdue:2026-12:2026-12-06");
    });

    it("covers no month before the first opened one", () => {
      const now = new Date("2026-11-25T10:00:00+08:00");
      const planned = plan({ now, switches: only("uploadBill"), months: [{ month: "2026-12", config: NOV_2026_CONFIG }] });
      expect(planned.map((n) => n.id.split(":")[2])).toEqual(planned.map(() => "2026-12"));
      expect(planned[0].id).toBe("uploadBill:dueTomorrow:2026-12:2026-12-01");
    });
  });

  describe("Collect tenant payments", () => {
    it("is due tomorrow, due today, then overdue every morning, with Paid and Nudge", () => {
      const planned = plan({ switches: only("collectPayments"), unpaidCharges: [charge({ id: "util-jordan" })] });
      expect(planned.slice(0, 3).map((n) => [n.id, n.at, n.channel, n.title, n.body])).toEqual([
        [
          `collectPayments:dueTomorrow:${PERSON_IDS.jordan}:2026-11-03`,
          "2026-11-03T08:00:00+08:00",
          "checks",
          "Collect $82.46 from Jordan",
          "Nov utilities. Due tomorrow.",
        ],
        [
          `collectPayments:dueToday:${PERSON_IDS.jordan}:2026-11-04`,
          "2026-11-04T08:00:00+08:00",
          "checks",
          "Collect $82.46 from Jordan",
          "Nov utilities. Due today.",
        ],
        [
          `collectPayments:overdue:${PERSON_IDS.jordan}:2026-11-05`,
          "2026-11-05T08:00:00+08:00",
          "action",
          "Collect $82.46 from Jordan",
          "Nov utilities. Overdue since 4 Nov.",
        ],
      ]);
      expect(planned).toHaveLength(14);
      expect(planned[0].tap).toBeNull();
      expect(planned[0].actions).toEqual([
        { kind: "paid", target: { kind: "mark-paid", chargeId: "util-jordan" } },
        { kind: "nudge", target: { kind: "send-nudge", personId: PERSON_IDS.jordan, chargeId: "util-jordan" } },
      ]);
    });

    it("groups a payer's charges due the same day, with a routed charge in its payer's reminder", () => {
      const priya = { personId: PERSON_IDS.priya, dueDate: new Date("2026-11-07") };
      const [tomorrow] = plan({
        switches: only("collectPayments"),
        unpaidCharges: [
          charge({ id: "starhub", ...priya, category: "RECURRING", label: "Starhub", amountCents: 2750 }),
          charge({ id: "rent-priya", ...priya, category: "RENT", label: "Rent", amountCents: 167500 }),
          // Sam's utilities have no date of their own and follow Priya's due day.
          charge({ id: "util-sam", personId: PERSON_IDS.sam, payViaPersonId: PERSON_IDS.priya, dueDate: null }),
        ],
      });
      expect([tomorrow.id, tomorrow.title, tomorrow.body]).toEqual([
        `collectPayments:dueTomorrow:${PERSON_IDS.priya}:2026-11-06`,
        "Collect $1,784.96 from Priya",
        "Nov rent, Nov utilities for Sam and Nov Starhub. Due tomorrow.",
      ]);
      expect(tomorrow.actions.map((a) => a.target)).toEqual([
        { kind: "mark-paid", chargeId: "rent-priya" },
        { kind: "send-nudge", personId: PERSON_IDS.priya, chargeId: "rent-priya" },
      ]);
    });

    it("names the first two charges and counts the rest past three", () => {
      const priya = { personId: PERSON_IDS.priya, dueDate: new Date("2026-11-07") };
      const [tomorrow] = plan({
        switches: only("collectPayments"),
        unpaidCharges: [
          charge({ id: "rent", ...priya, category: "RENT", label: "Rent", amountCents: 167500 }),
          charge({ id: "util", ...priya, amountCents: 12369 }),
          charge({ id: "aircon", ...priya, category: "AIRCON", label: "Aircon servicing", amountCents: 3667 }),
          charge({ id: "starhub", ...priya, category: "RECURRING", label: "Starhub", amountCents: 2750 }),
        ],
      });
      expect(tomorrow.body).toBe("Nov rent, Nov utilities and 2 more. Due tomorrow.");
    });

    it("groups every overdue charge of a payer, whatever its due date, since the earliest", () => {
      const now = new Date("2026-11-10T10:00:00+08:00");
      const [overdue] = plan({
        now,
        switches: only("collectPayments"),
        unpaidCharges: [
          charge({ id: "util-jordan" }),
          charge({ id: "rent-jordan", category: "RENT", label: "Rent", amountCents: 95000, dueDate: new Date("2026-11-01") }),
        ],
      });
      expect([overdue.id, overdue.channel, overdue.title, overdue.body]).toEqual([
        `collectPayments:overdue:${PERSON_IDS.jordan}:2026-11-11`,
        "action",
        "Collect $1,032.46 from Jordan",
        "Nov rent and Nov utilities. Overdue since 1 Nov.",
      ]);
      expect(overdue.actions[0].target).toEqual({ kind: "mark-paid", chargeId: "rent-jordan" });
    });

    it("keeps each stage its own reminder on the same morning", () => {
      const now = new Date("2026-11-04T10:00:00+08:00");
      const fridge = charge({ id: "fridge", category: "ONE_OFF", label: "Fridge repair", dueDate: new Date("2026-11-06") });
      expect(
        brief({ now, switches: only("collectPayments"), unpaidCharges: [charge({ id: "util" }), fridge] })
          .filter(([, at]) => at.startsWith("2026-11-05"))
          .map(([id, , , , body]) => [id, body]),
      ).toEqual([
        [`collectPayments:dueTomorrow:${PERSON_IDS.jordan}:2026-11-05`, "Nov Fridge repair. Due tomorrow."],
        [`collectPayments:overdue:${PERSON_IDS.jordan}:2026-11-05`, "Nov utilities. Overdue since 4 Nov."],
      ]);
    });

    it("names a correction by its short name", () => {
      const [tomorrow] = plan({
        switches: only("collectPayments"),
        unpaidCharges: [
          charge({
            id: "fix",
            category: "CORRECTION",
            label: "Utilities correction (Oct)",
            amountCents: 500,
            correctsCharge: { label: "Utilities", month: "2026-10" },
          }),
        ],
      });
      expect(tomorrow.body).toBe("Correction · Utilities Oct. Due tomorrow.");
    });

    it("leaves out a refund, the owner's charges and a charge with no due date", () => {
      expect(
        plan({
          switches: only("collectPayments"),
          unpaidCharges: [
            charge({ id: "refund", amountCents: -500 }),
            charge({ id: "owner", personId: PERSON_IDS.alex }),
            charge({ id: "undated", category: "ONE_OFF", label: "Fridge repair", dueDate: null }),
          ],
        }),
      ).toEqual([]);
    });
  });

  describe("Pay utilities bill", () => {
    const now = new Date("2026-11-12T10:00:00+08:00");
    const paidSome: PlanBill = {
      ...NOV_BILL,
      utilities: [
        { personId: PERSON_IDS.alex, amountCents: 12369, paidCents: 12369 },
        { personId: PERSON_IDS.priya, amountCents: 12369, paidCents: 12369 },
        { personId: PERSON_IDS.sam, amountCents: 8246, paidCents: 9000 },
        { personId: PERSON_IDS.jordan, amountCents: 8246, paidCents: null },
      ],
    };

    it("is due on the bill's due day, with what the others have paid, no more than each charge", () => {
      expect(brief({ now, switches: only("payBill"), bills: [paidBill("2026-10"), paidSome] }).slice(0, 3)).toEqual([
        [
          "payBill:dueTomorrow:2026-11:2026-11-15",
          "2026-11-15T08:00",
          "checks",
          "Pay utilities bill: collected $206.15 of $412.30",
          "Due tomorrow, 16 Nov.",
        ],
        [
          "payBill:dueToday:2026-11:2026-11-16",
          "2026-11-16T08:00",
          "checks",
          "Pay utilities bill: collected $206.15 of $412.30",
          "Due today.",
        ],
        [
          "payBill:overdue:2026-11:2026-11-17",
          "2026-11-17T08:00",
          "action",
          "Pay utilities bill: collected $206.15 of $412.30",
          "Overdue since 16 Nov.",
        ],
      ]);
    });

    it("uses the saved bill's own due date", () => {
      const [first] = plan({
        now,
        switches: only("payBill"),
        bills: [paidBill("2026-10"), { ...NOV_BILL, dueDate: new Date("2026-11-20") }],
      });
      expect([first.id, first.body]).toEqual(["payBill:dueTomorrow:2026-11:2026-11-19", "Due tomorrow, 20 Nov."]);
    });

    it("is not planned once the bill is marked paid", () => {
      expect(plan({ now, switches: only("payBill"), bills: [paidBill("2026-10"), paidBill("2026-11")] })).toEqual([]);
    });
  });

  describe("Aircon servicing due", () => {
    it("fires once at 08:00, 90 days after the Singapore date the latest aircon charge was added", () => {
      const now = new Date("2026-11-10T10:00:00+08:00");
      // 19 Aug 17:00 UTC is 20 Aug in Singapore; 90 days on is 18 Nov.
      const lastAirconAt = new Date("2026-08-19T17:00:00Z");
      expect(brief({ now, switches: only("fyi"), lastAirconAt })).toEqual([
        ["airconDue:2026-11-18", "2026-11-18T08:00", "fyi", "Aircon servicing due?", "It’s been 3 months since the last one."],
      ]);
    });

    it("is not planned before the first aircon charge, once its day has passed, or with FYI updates off", () => {
      const now = new Date("2026-11-10T10:00:00+08:00");
      expect(plan({ now, switches: only("fyi"), lastAirconAt: null })).toEqual([]);
      expect(plan({ now, switches: only("fyi"), lastAirconAt: new Date("2026-08-01T12:00:00+08:00") })).toEqual([]);
      expect(plan({ now, switches: only("uploadBill"), lastAirconAt: new Date("2026-08-20T12:00:00+08:00") })).toEqual(
        [],
      );
    });
  });

  describe("Event FYIs", () => {
    const now = new Date("2026-11-29T14:03:00+08:00");
    const settled = {
      id: "e1",
      key: "settled:2026-11:2026-11-29",
      typeKey: "monthSettled",
      params: { month: "November" },
      status: "PENDING" as const,
      createdAt: new Date("2026-11-29T14:02:00+08:00"),
      fireAt: null,
    };

    it("puts a pending event in time order with the reminders, a few seconds out, parsing with the shared schema", () => {
      const planned = plan({
        now,
        switches: ALL_ON,
        unpaidCharges: [charge({ id: "c" })],
        events: [settled],
      });
      const fyi = planned.find((n) => n.id === settled.key);
      expect(plannedNotificationSchema.parse(fyi)).toMatchObject({
        channel: "fyi",
        title: "November is settled",
        at: "2026-11-29T14:03:05+08:00",
        acknowledge: true,
      });
      expect(planned[0].id).toBe(settled.key);
      expect(planned.filter((n) => n.id !== settled.key).every((n) => !n.acknowledge)).toBe(true);
    });

    it("leaves events out with FYI updates off", () => {
      expect(plan({ now, switches: only("uploadBill"), events: [settled] }).map((n) => n.id)).not.toContain(settled.key);
    });
  });
});

describe("uploadMonths", () => {
  it("covers every opened month, this month and the month the window ends in", () => {
    expect(uploadMonths(new Date("2026-11-25T10:00:00+08:00"), ["2026-10", "2026-11"])).toEqual([
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
    expect(uploadMonths(new Date("2026-11-10T10:00:00+08:00"), ["2026-11"])).toEqual(["2026-11"]);
  });

  it("covers no month before the first opened one, and nothing before First run", () => {
    expect(uploadMonths(new Date("2026-11-25T10:00:00+08:00"), ["2026-12"])).toEqual(["2026-12"]);
    expect(uploadMonths(new Date("2026-11-25T10:00:00+08:00"), [])).toEqual([]);
  });
});
