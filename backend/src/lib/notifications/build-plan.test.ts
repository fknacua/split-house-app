import { describe, expect, it } from "vitest";
import {
  plannedNotificationSchema,
  type NotificationGroupKey,
  type NotificationGroupSwitches,
} from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS, VERSION_A_CONFIG } from "@/lib/fixtures/household";
import { buildNotificationPlan, type PlanBill, type PlanCharge, type PlanInput } from "./build-plan";

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

/** Only the given switch on, so each table looks at one kind of notification. */
const only = (key: NotificationGroupKey): NotificationGroupSwitches => ({
  uploadBill: false,
  collectPayments: false,
  payBill: false,
  fyi: false,
  [key]: true,
});

/** An unpaid Nov charge of Jordan's, due 4 Nov, with the given changes. */
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
    now: new Date("2026-11-25T10:00:00+08:00"),
    switches: { uploadBill: true, collectPayments: true, payBill: true, fyi: false },
    people: PEOPLE,
    months: MONTHS,
    unpaidCharges: [],
    bills: [],
    ...over,
  });

describe("buildNotificationPlan", () => {
  it("plans nothing before First run has opened a month", () => {
    expect(plan({ months: [], unpaidCharges: [charge({ id: "c1" })], bills: [NOV_BILL] })).toEqual([]);
  });

  it("answers with notifications that parse with the shared schema, in time order", () => {
    const planned = plan({ unpaidCharges: [charge({ id: "rent", category: "RENT", label: "Rent", amountCents: 95000 })] });
    for (const n of planned) expect(plannedNotificationSchema.safeParse(n).success).toBe(true);
    const times = planned.map((n) => new Date(n.at).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  describe("Upload the utilities bill", () => {
    it("is planned at 9:00 every day from tomorrow to the end of next month while neither bill is saved", () => {
      const planned = plan({ switches: only("uploadBill") });
      expect(planned.map((n) => n.at)).toHaveLength(5 + 30);
      expect(planned[0]).toEqual({
        id: "upload:2026-11-26",
        channel: "action",
        title: "Upload this month’s utilities bill",
        body: "It usually lands around the 2nd. Tap to upload it.",
        at: "2026-11-26T09:00:00+08:00",
        tap: { kind: "bill-upload", month: "2026-11" },
        actions: [],
      });
      expect(planned.at(-1)?.id).toBe("upload:2026-12-31");
    });

    it("starts on the 2nd, and plans next month from the date alone", () => {
      const planned = plan({ now: new Date("2026-11-01T08:00:00+08:00"), switches: only("uploadBill") });
      expect(planned[0].id).toBe("upload:2026-11-02");
      expect(planned.find((n) => n.id === "upload:2026-12-01")).toBeUndefined();
      expect(planned.find((n) => n.id === "upload:2026-12-02")?.tap).toEqual({ kind: "bill-upload", month: "2026-12" });
    });

    it("stops for a month whose bill is saved", () => {
      const planned = plan({ switches: only("uploadBill"), bills: [NOV_BILL] });
      expect(planned).toHaveLength(30);
      expect(planned.every((n) => n.id.startsWith("upload:2026-12-"))).toBe(true);
    });
  });

  describe("Collect rent", () => {
    it("is planned at 9:00 on the month's last weekday, one per tenant with Paid and Nudge", () => {
      const planned = plan({
        switches: only("collectPayments"),
        unpaidCharges: [charge({ id: "rent-jordan", category: "RENT", label: "Rent", amountCents: 95000 })],
      });
      expect(planned).toEqual([
        {
          id: "rent:rent-jordan",
          channel: "action",
          title: "Collect Jordan’s rent",
          body: "Their November rent of $950.00 is still unpaid.",
          at: "2026-11-30T09:00:00+08:00",
          tap: null,
          actions: [
            { kind: "paid", target: { kind: "mark-paid", chargeId: "rent-jordan" } },
            { kind: "nudge", target: { kind: "send-nudge", personId: PERSON_IDS.jordan, chargeId: "rent-jordan" } },
          ],
        },
      ]);
    });

    it("adds the weekend line on a Friday, skipping the weekend after it", () => {
      const [rent] = plan({
        now: new Date("2026-10-20T10:00:00+08:00"),
        switches: only("collectPayments"),
        unpaidCharges: [charge({ id: "rent-oct", month: "2026-10", category: "RENT", label: "Rent", amountCents: 92000 })],
      });
      expect(rent.at).toBe("2026-10-30T09:00:00+08:00");
      expect(rent.body).toBe("Their October rent of $920.00 is still unpaid. Weekend transfers can be slow.");
    });

    it("names who it is collected from when the rent is paid through someone", () => {
      const [rent] = plan({
        switches: only("collectPayments"),
        unpaidCharges: [
          charge({ id: "rent-sam", personId: PERSON_IDS.sam, payViaPersonId: PERSON_IDS.priya, category: "RENT", label: "Rent" }),
        ],
      });
      expect(rent.title).toBe("Collect Sam’s rent from Priya");
      expect(rent.actions[1].target).toEqual({ kind: "send-nudge", personId: PERSON_IDS.priya, chargeId: "rent-sam" });
    });

    it("leaves out the owner's rent and a day already past", () => {
      expect(
        plan({
          switches: only("collectPayments"),
          unpaidCharges: [
            charge({ id: "rent-alex", personId: PERSON_IDS.alex, category: "RENT", label: "Rent" }),
            charge({ id: "rent-oct", month: "2026-10", category: "RENT", label: "Rent" }),
          ],
        }),
      ).toEqual([]);
    });
  });

  describe("Pay the utilities bill", () => {
    const now = new Date("2026-11-03T10:00:00+08:00");

    it("is planned at 9:00 the day before the due day, with what the others have paid", () => {
      const bill: PlanBill = {
        ...NOV_BILL,
        utilities: NOV_BILL.utilities.map((u) =>
          u.personId === PERSON_IDS.jordan ? { ...u, paidCents: 8246 } : u.personId === PERSON_IDS.alex ? { ...u, paidCents: 12369 } : u,
        ),
      };
      expect(plan({ now, switches: only("payBill"), bills: [bill] })).toEqual([
        {
          id: "pay-bill:2026-11",
          channel: "action",
          title: "Pay utilities bill: collected $82.46 of $412.30",
          body: "Due 16 Nov.",
          at: "2026-11-15T09:00:00+08:00",
          tap: null,
          actions: [],
        },
      ]);
    });

    it("uses the saved bill's own due date, and counts no more than a charge for an overpayment", () => {
      const bill: PlanBill = {
        ...NOV_BILL,
        dueDate: new Date("2026-11-20"),
        utilities: NOV_BILL.utilities.map((u) => (u.personId === PERSON_IDS.sam ? { ...u, paidCents: 9000 } : u)),
      };
      const [payBill] = plan({ now, switches: only("payBill"), bills: [bill] });
      expect(payBill.title).toBe("Pay utilities bill: collected $82.46 of $412.30");
      expect(payBill.at).toBe("2026-11-19T09:00:00+08:00");
    });

    it("is not planned once the bill is marked paid", () => {
      expect(plan({ now, switches: only("payBill"), bills: [{ ...NOV_BILL, paidCents: 41230 }] })).toEqual([]);
    });
  });

  describe("Payment checks", () => {
    const now = new Date("2026-11-03T10:00:00+08:00");
    // Collect rent shares the switch until 14.7, so keep to the payment checks.
    const titles = (unpaidCharges: PlanCharge[]) =>
      plan({ now, switches: only("collectPayments"), unpaidCharges })
        .filter((n) => n.id.startsWith("check:"))
        .map((n) => [n.title, n.at]);

    it("is planned at 20:00 on the due date, with Paid and Nudge", () => {
      expect(plan({ now, switches: only("collectPayments"), unpaidCharges: [charge({ id: "util-jordan" })] })).toEqual([
        {
          id: "check:util-jordan",
          channel: "checks",
          title: "Did Jordan pay Nov utilities ($82.46)?",
          body: "Due today.",
          at: "2026-11-04T20:00:00+08:00",
          tap: null,
          actions: [
            { kind: "paid", target: { kind: "mark-paid", chargeId: "util-jordan" } },
            { kind: "nudge", target: { kind: "send-nudge", personId: PERSON_IDS.jordan, chargeId: "util-jordan" } },
          ],
        },
      ]);
    });

    it("names each kind of charge", () => {
      expect(
        titles([
          charge({ id: "rent", category: "RENT", label: "Rent", amountCents: 95000, dueDate: new Date("2026-11-05") }),
          charge({ id: "aircon", category: "AIRCON", label: "Aircon servicing", amountCents: 1833, dueDate: new Date("2026-11-06") }),
          charge({ id: "starhub", personId: PERSON_IDS.priya, category: "RECURRING", label: "Starhub", amountCents: 2750, dueDate: new Date("2026-11-07") }),
          charge({
            id: "fix",
            category: "CORRECTION",
            label: "Utilities correction (Oct)",
            amountCents: 500,
            dueDate: new Date("2026-11-08"),
            correctsCharge: { label: "Utilities", month: "2026-10" },
          }),
        ]),
      ).toEqual([
        ["Did Jordan pay Nov rent ($950.00)?", "2026-11-05T20:00:00+08:00"],
        ["Did Jordan pay Nov aircon servicing ($18.33)?", "2026-11-06T20:00:00+08:00"],
        ["Did Priya pay Nov Starhub ($27.50)?", "2026-11-07T20:00:00+08:00"],
        ["Did Jordan pay Correction · Utilities Oct ($5.00)?", "2026-11-08T20:00:00+08:00"],
      ]);
    });

    it("names the payer of a routed charge, on the payer's due day when it has no date of its own", () => {
      const [check] = plan({
        now,
        switches: only("collectPayments"),
        unpaidCharges: [charge({ id: "util-sam", personId: PERSON_IDS.sam, payViaPersonId: PERSON_IDS.priya, dueDate: null })],
      });
      expect([check.title, check.at]).toEqual(["Did Priya pay Nov utilities for Sam ($82.46)?", "2026-11-07T20:00:00+08:00"]);
      expect(check.actions[1].target).toEqual({ kind: "send-nudge", personId: PERSON_IDS.priya, chargeId: "util-sam" });
    });

    it("never checks a refund, the owner's charge, a charge with no due date or one due after next month", () => {
      expect(
        titles([
          charge({ id: "refund", category: "CORRECTION", amountCents: -500, correctsCharge: { label: "Utilities", month: "2026-10" } }),
          charge({ id: "alex", personId: PERSON_IDS.alex }),
          charge({ id: "undated", category: "ONE_OFF", label: "Cleaning", dueDate: null }),
          charge({ id: "late", category: "ONE_OFF", label: "Cleaning", dueDate: new Date("2027-01-05") }),
          charge({ id: "past", dueDate: new Date("2026-11-02") }),
        ]),
      ).toEqual([]);
    });

    it("still checks today until 20:00", () => {
      const evening = new Date("2026-11-04T19:59:00+08:00");
      expect(plan({ now: evening, switches: only("collectPayments"), unpaidCharges: [charge({ id: "c" })] })).toHaveLength(1);
      const late = new Date("2026-11-04T20:00:00+08:00");
      expect(plan({ now: late, switches: only("collectPayments"), unpaidCharges: [charge({ id: "c" })] })).toEqual([]);
    });
  });

  it("plans nothing with every switch off", () => {
    const off = { uploadBill: false, collectPayments: false, payBill: false, fyi: false };
    expect(
      plan({
        now: new Date("2026-11-03T10:00:00+08:00"),
        switches: off,
        unpaidCharges: [charge({ id: "c", category: "RENT", label: "Rent" })],
        bills: [NOV_BILL],
      }),
    ).toEqual([]);
  });
});
